/**
 * @factory/attnres-memory — In-Memory Storage Adapter
 *
 * A zero-dependency adapter that keeps all memory blocks in a plain `Map`.
 * Intended for testing, prototyping, and environments where persistence
 * is unnecessary.
 */

import type { MemoryBlock, StorageAdapter } from '../core/types.js';

export class InMemoryAdapter implements StorageAdapter {
  private readonly blocks = new Map<string, MemoryBlock>();

  async store(block: MemoryBlock): Promise<MemoryBlock> {
    // Deep-clone so callers cannot mutate internal state by reference.
    const clone = structuredClone(block);
    this.blocks.set(clone.id, clone);
    return structuredClone(clone);
  }

  /**
   * Retrieve blocks whose content includes any word from `query`.
   *
   * This is a deliberately simple implementation — production adapters
   * should use vector similarity or full-text search.
   */
  async retrieve(query: string, limit: number): Promise<MemoryBlock[]> {
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    if (keywords.length === 0) {
      // No useful query terms — return everything up to limit.
      return this.firstN(limit);
    }

    const scored: Array<{ block: MemoryBlock; hits: number }> = [];

    for (const block of this.blocks.values()) {
      const lower = block.content.toLowerCase();
      let hits = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) hits++;
      }
      if (hits > 0) {
        scored.push({ block: structuredClone(block), hits });
      }
    }

    scored.sort((a, b) => b.hits - a.hits);
    return scored.slice(0, limit).map((s) => s.block);
  }

  async update(
    id: string,
    partial: Partial<MemoryBlock>,
  ): Promise<MemoryBlock> {
    const existing = this.blocks.get(id);
    if (!existing) {
      throw new Error(`MemoryBlock not found: ${id}`);
    }

    const updated: MemoryBlock = { ...existing, ...partial, id: existing.id };
    this.blocks.set(id, updated);
    return structuredClone(updated);
  }

  async delete(id: string): Promise<boolean> {
    return this.blocks.delete(id);
  }

  async getAll(): Promise<MemoryBlock[]> {
    return [...this.blocks.values()].map((b) => structuredClone(b));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Return the first `n` blocks (insertion order). */
  private firstN(n: number): MemoryBlock[] {
    const result: MemoryBlock[] = [];
    for (const block of this.blocks.values()) {
      if (result.length >= n) break;
      result.push(structuredClone(block));
    }
    return result;
  }

  /** Number of blocks currently held in memory.  Useful for tests. */
  get size(): number {
    return this.blocks.size;
  }
}
