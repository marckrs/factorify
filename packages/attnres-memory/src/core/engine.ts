/**
 * @factory/attnres-memory — AttnRes Engine
 *
 * The central runtime that manages memory blocks, computes attention scores,
 * handles time-based decay, and prunes low-signal memories.
 */

import { randomUUID } from 'node:crypto';

import type {
  AttnResConfig,
  BlockType,
  MemoryBlock,
  QueryResult,
  StorageAdapter,
} from './types.js';
import { BiasRegistry } from './bias-registry.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Rough token estimate: ~4 characters per token for English text. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Clamp a value to `[0, 1]`. */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// ── Default Config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AttnResConfig = {
  max_blocks: 1000,
  attention_threshold: 0.1,
  decay_interval_ms: 60_000, // 1 minute
  bias_weights: {
    recency: 0.3,
    importance: 0.4,
    frequency: 0.2,
    relevance: 0.1,
  },
};

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * Manages an attention-weighted reservoir of memory blocks.
 *
 * The engine delegates persistence to a {@link StorageAdapter} and combines
 * multiple signals (importance, recency, access frequency, and configurable
 * bias weights) into a single attention score per block.
 */
export class AttnResEngine {
  private readonly adapter: StorageAdapter;
  private readonly config: AttnResConfig;
  private readonly biasRegistry: BiasRegistry;
  private decayTimer: ReturnType<typeof setInterval> | null = null;

  constructor(adapter: StorageAdapter, config?: Partial<AttnResConfig>) {
    this.adapter = adapter;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.biasRegistry = new BiasRegistry();

    // Overwrite default registry biases with any caller-supplied weights.
    for (const [name, weight] of Object.entries(this.config.bias_weights)) {
      this.biasRegistry.register(name, weight);
    }

    // Start periodic decay if configured.
    if (this.config.decay_interval_ms > 0) {
      this.startDecayLoop();
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Stop the automatic decay timer (idempotent). */
  stop(): void {
    if (this.decayTimer !== null) {
      clearInterval(this.decayTimer);
      this.decayTimer = null;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Create and persist a new memory block.
   *
   * If the reservoir is at capacity, the block with the lowest attention
   * score is evicted to make room.
   */
  async addMemory(
    content: string,
    importance: number,
    block_type: BlockType,
    metadata: Record<string, unknown> = {},
  ): Promise<MemoryBlock> {
    const now = new Date().toISOString();

    const block: MemoryBlock = {
      id: randomUUID(),
      content,
      importance: clamp01(importance),
      block_type,
      metadata,
      created_at: now,
      last_accessed: now,
      access_count: 0,
      decay_rate: block_type === 'foundational' ? 0.98 : 0.95,
    };

    // Enforce capacity limit.
    const all = await this.adapter.getAll();
    if (all.length >= this.config.max_blocks) {
      await this.evictLowest(all);
    }

    return this.adapter.store(block);
  }

  /**
   * Retrieve the most relevant memory blocks for a given prompt.
   *
   * Every block in storage is scored; only those above
   * `config.attention_threshold` are returned, sorted descending by score,
   * up to `limit`.
   */
  async query(prompt: string, limit = 10): Promise<QueryResult> {
    // Ask the adapter for a broad candidate set (3x limit to leave room for
    // filtering), then re-score everything ourselves.
    const candidates = await this.adapter.retrieve(prompt, limit * 3);

    const scored: Array<{ block: MemoryBlock; score: number }> = [];
    const attentionScores = new Map<string, number>();

    for (const block of candidates) {
      const score = this.computeAttentionScore(block, prompt);
      attentionScores.set(block.id, score);

      if (score >= this.config.attention_threshold) {
        scored.push({ block, score });
      }
    }

    // Sort descending by score and take the top `limit`.
    scored.sort((a, b) => b.score - a.score);
    const topBlocks = scored.slice(0, limit).map((s) => s.block);

    // Bump access stats for returned blocks.
    const now = new Date().toISOString();
    await Promise.all(
      topBlocks.map((b) =>
        this.adapter.update(b.id, {
          last_accessed: now,
          access_count: b.access_count + 1,
        }),
      ),
    );

    const totalTokens = topBlocks.reduce(
      (sum, b) => sum + estimateTokens(b.content),
      0,
    );

    return {
      blocks: topBlocks,
      total_tokens_used: totalTokens,
      attention_scores: attentionScores,
    };
  }

  /**
   * Apply time-based decay to every block in the reservoir.
   *
   * Each block's `importance` is multiplied by its `decay_rate`, pushing
   * stale memories closer to the pruning threshold over time.
   */
  async decayMemories(): Promise<void> {
    const all = await this.adapter.getAll();

    await Promise.all(
      all.map((block) => {
        const newImportance = clamp01(block.importance * block.decay_rate);
        return this.adapter.update(block.id, { importance: newImportance });
      }),
    );
  }

  /**
   * Delete every block whose current importance is strictly below `threshold`.
   *
   * @returns The number of blocks pruned.
   */
  async pruneBelow(threshold: number): Promise<number> {
    const all = await this.adapter.getAll();
    const toPrune = all.filter((b) => b.importance < threshold);

    await Promise.all(toPrune.map((b) => this.adapter.delete(b.id)));
    return toPrune.length;
  }

  /** Expose the bias registry for external inspection / mutation. */
  getBiasRegistry(): BiasRegistry {
    return this.biasRegistry;
  }

  // ── Scoring ───────────────────────────────────────────────────────────────

  /**
   * Compute a composite attention score in `[0, 1]` for a single block.
   *
   * The score blends four normalised signals, each weighted by the
   * corresponding bias in the registry:
   *
   * 1. **importance** — the block's own importance value.
   * 2. **recency**    — exponential decay based on age in milliseconds.
   * 3. **frequency**  — log-scaled access count.
   * 4. **relevance**  — simple keyword overlap between prompt & content.
   */
  private computeAttentionScore(block: MemoryBlock, prompt: string): number {
    const biases = this.biasRegistry.getAll();
    const totalWeight = Object.values(biases).reduce((a, b) => a + b, 0);

    if (totalWeight === 0) return 0;

    const importanceSignal = block.importance;

    // Recency: exponential decay with a 24-hour half-life.
    const ageMs = Date.now() - new Date(block.last_accessed).getTime();
    const halfLife = 24 * 60 * 60 * 1000; // 24 hours
    const recencySignal = Math.exp((-Math.LN2 * ageMs) / halfLife);

    // Frequency: logarithmic scaling, capped at 1.
    const frequencySignal = clamp01(Math.log2(block.access_count + 1) / 10);

    // Relevance: ratio of prompt keywords found in the block content.
    const relevanceSignal = this.computeKeywordOverlap(prompt, block.content);

    const signals: Record<string, number> = {
      importance: importanceSignal,
      recency: recencySignal,
      frequency: frequencySignal,
      relevance: relevanceSignal,
    };

    let weightedSum = 0;
    for (const [name, weight] of Object.entries(biases)) {
      const signal = signals[name] ?? 0;
      weightedSum += signal * weight;
    }

    return clamp01(weightedSum / totalWeight);
  }

  /** Word-level overlap ratio between `query` and `content`. */
  private computeKeywordOverlap(query: string, content: string): number {
    const queryWords = new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2),
    );

    if (queryWords.size === 0) return 0;

    const contentLower = content.toLowerCase();
    let matches = 0;

    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        matches++;
      }
    }

    return matches / queryWords.size;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /** Evict the single lowest-scored block from the provided set. */
  private async evictLowest(blocks: MemoryBlock[]): Promise<void> {
    if (blocks.length === 0) return;

    let lowestScore = Infinity;
    let lowestId = blocks[0].id;

    for (const block of blocks) {
      const score = this.computeAttentionScore(block, '');
      if (score < lowestScore) {
        lowestScore = score;
        lowestId = block.id;
      }
    }

    await this.adapter.delete(lowestId);
  }

  private startDecayLoop(): void {
    this.decayTimer = setInterval(() => {
      void this.decayMemories();
    }, this.config.decay_interval_ms);

    // Allow the process to exit even if the timer is still running.
    if (typeof this.decayTimer === 'object' && 'unref' in this.decayTimer) {
      this.decayTimer.unref();
    }
  }
}
