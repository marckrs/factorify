/**
 * @factory/attnres-memory — AttnRes Agent
 *
 * High-level facade that wraps {@link AttnResEngine} with a simpler,
 * intent-oriented API suitable for direct use inside AI agent loops.
 */

import type {
  AttnResConfig,
  BlockType,
  MemoryBlock,
  QueryResult,
  StorageAdapter,
} from '../core/types.js';
import { AttnResEngine } from '../core/engine.js';

/** Summary statistics returned by {@link AttnResAgent.getStats}. */
export interface AgentStats {
  total_blocks: number;
  blocks_by_type: Record<BlockType, number>;
  average_importance: number;
  total_access_count: number;
}

/**
 * Convenience wrapper around the AttnRes engine.
 *
 * ```ts
 * const agent = new AttnResAgent(adapter);
 * await agent.remember('The user prefers dark mode.', 0.8);
 * const result = await agent.recall('user preferences');
 * ```
 */
export class AttnResAgent {
  private readonly engine: AttnResEngine;
  private readonly adapter: StorageAdapter;

  constructor(adapter: StorageAdapter, config?: Partial<AttnResConfig>) {
    this.adapter = adapter;
    this.engine = new AttnResEngine(adapter, config);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Store a new memory in the reservoir.
   *
   * @param content    - The text to remember.
   * @param importance - Optional importance score in `[0, 1]` (default `0.5`).
   * @param metadata   - Optional key/value metadata.
   * @param block_type - Optional block classification (default `'recent'`).
   * @returns The persisted {@link MemoryBlock}.
   */
  async remember(
    content: string,
    importance = 0.5,
    metadata: Record<string, unknown> = {},
    block_type: BlockType = 'recent',
  ): Promise<MemoryBlock> {
    return this.engine.addMemory(content, importance, block_type, metadata);
  }

  /**
   * Recall the most relevant memories for a given query.
   *
   * @param query - Natural-language search prompt.
   * @param limit - Maximum number of results (default `5`).
   */
  async recall(query: string, limit = 5): Promise<QueryResult> {
    return this.engine.query(query, limit);
  }

  /**
   * Permanently forget a specific memory by its ID.
   *
   * @returns `true` if the memory existed and was deleted.
   */
  async forget(id: string): Promise<boolean> {
    return this.adapter.delete(id);
  }

  /**
   * Return aggregate statistics about the current reservoir state.
   */
  async getStats(): Promise<AgentStats> {
    const all = await this.adapter.getAll();

    const blocksByType: Record<BlockType, number> = {
      recent: 0,
      relevant: 0,
      foundational: 0,
    };

    let totalImportance = 0;
    let totalAccess = 0;

    for (const block of all) {
      blocksByType[block.block_type]++;
      totalImportance += block.importance;
      totalAccess += block.access_count;
    }

    return {
      total_blocks: all.length,
      blocks_by_type: blocksByType,
      average_importance: all.length > 0 ? totalImportance / all.length : 0,
      total_access_count: totalAccess,
    };
  }

  /**
   * Run a single decay pass and prune blocks that fall below the engine's
   * attention threshold.
   *
   * @returns The number of blocks pruned.
   */
  async maintain(pruneThreshold = 0.05): Promise<number> {
    await this.engine.decayMemories();
    return this.engine.pruneBelow(pruneThreshold);
  }

  /** Stop background timers (decay loop).  Call before discarding the agent. */
  stop(): void {
    this.engine.stop();
  }
}
