/**
 * @factory/attnres-memory — Core type definitions for the AttnRes memory system.
 *
 * AttnRes (Attention Reservoir) is a selective memory system that uses
 * attention-based scoring to prioritise which memories an AI agent retains
 * and retrieves.
 */

// ── Memory Block ────────────────────────────────────────────────────────────

/** The three classification tiers for a memory block. */
export type BlockType = 'recent' | 'relevant' | 'foundational';

/**
 * A single unit of memory stored in the reservoir.
 *
 * Every block carries its own importance score, decay rate, and access
 * statistics so the engine can compute an attention score on-the-fly.
 */
export interface MemoryBlock {
  /** Globally unique identifier (UUID v4). */
  readonly id: string;

  /** The textual content of this memory. */
  content: string;

  /**
   * Normalised importance score in the range `[0, 1]`.
   * Higher values indicate greater long-term significance.
   */
  importance: number;

  /** Classification tier that influences bias weighting during retrieval. */
  block_type: BlockType;

  /** Arbitrary key/value metadata attached by the caller. */
  metadata: Record<string, unknown>;

  /** ISO-8601 timestamp of when this block was created. */
  created_at: string;

  /** ISO-8601 timestamp of the most recent retrieval. */
  last_accessed: string;

  /** Total number of times this block has been retrieved. */
  access_count: number;

  /**
   * Per-block decay multiplier in `[0, 1]`.
   * Applied every decay interval to reduce effective importance over time.
   * A value of `1` means no decay; `0` means instant decay.
   */
  decay_rate: number;
}

// ── Configuration ───────────────────────────────────────────────────────────

/**
 * Runtime configuration for the AttnRes engine.
 */
export interface AttnResConfig {
  /** Maximum number of memory blocks the reservoir will hold. */
  max_blocks: number;

  /**
   * Minimum attention score (in `[0, 1]`) a block must achieve to be
   * included in query results.
   */
  attention_threshold: number;

  /**
   * How often (in milliseconds) the engine should apply decay to all
   * stored blocks.  Set to `0` to disable automatic decay.
   */
  decay_interval_ms: number;

  /**
   * Named bias weights used during attention scoring.
   * Common keys: `recency`, `importance`, `frequency`, `relevance`.
   */
  bias_weights: Record<string, number>;
}

// ── Storage Adapter ─────────────────────────────────────────────────────────

/**
 * Pluggable persistence layer.
 *
 * Implement this interface to back the AttnRes reservoir with any storage
 * backend (Supabase, SQLite, Redis, plain memory, etc.).
 */
export interface StorageAdapter {
  /** Persist a new block and return it (potentially enriched by the backend). */
  store(block: MemoryBlock): Promise<MemoryBlock>;

  /**
   * Return up to `limit` blocks whose content is relevant to `query`.
   * The adapter is free to use full-text search, vector similarity, or
   * simple substring matching — the engine re-scores results anyway.
   */
  retrieve(query: string, limit: number): Promise<MemoryBlock[]>;

  /** Partially update an existing block by its `id`. */
  update(id: string, partial: Partial<MemoryBlock>): Promise<MemoryBlock>;

  /** Permanently delete a block by its `id`.  Returns `true` on success. */
  delete(id: string): Promise<boolean>;

  /** Return every block currently in storage (use with care). */
  getAll(): Promise<MemoryBlock[]>;
}

// ── Query Result ────────────────────────────────────────────────────────────

/**
 * The response object returned by {@link AttnResEngine.query}.
 */
export interface QueryResult {
  /** The blocks that passed the attention threshold, sorted by score desc. */
  blocks: MemoryBlock[];

  /** Rough estimate of total tokens consumed by the returned blocks. */
  total_tokens_used: number;

  /**
   * Per-block attention scores keyed by block `id`.
   * Useful for debugging and for surfacing confidence to callers.
   */
  attention_scores: Map<string, number>;
}
