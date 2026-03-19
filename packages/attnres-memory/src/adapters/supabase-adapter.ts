/**
 * @factory/attnres-memory — Supabase Storage Adapter
 *
 * Persists memory blocks in a Supabase Postgres table (`attnres_memories`).
 * Requires the schema from `schemas/supabase.sql` to be applied first.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemoryBlock, StorageAdapter } from '../core/types.js';

const TABLE = 'attnres_memories' as const;

/**
 * Map a Supabase row (snake_case JSON) back into a {@link MemoryBlock}.
 */
function rowToBlock(row: Record<string, unknown>): MemoryBlock {
  return {
    id: row['id'] as string,
    content: row['content'] as string,
    importance: row['importance'] as number,
    block_type: row['block_type'] as MemoryBlock['block_type'],
    metadata: (row['metadata'] as Record<string, unknown>) ?? {},
    created_at: row['created_at'] as string,
    last_accessed: row['last_accessed'] as string,
    access_count: row['access_count'] as number,
    decay_rate: row['decay_rate'] as number,
  };
}

/**
 * Map a {@link MemoryBlock} into the shape expected by the Supabase table.
 */
function blockToRow(
  block: MemoryBlock,
): Record<string, unknown> {
  return {
    id: block.id,
    content: block.content,
    importance: block.importance,
    block_type: block.block_type,
    metadata: block.metadata,
    created_at: block.created_at,
    last_accessed: block.last_accessed,
    access_count: block.access_count,
    decay_rate: block.decay_rate,
  };
}

export class SupabaseAdapter implements StorageAdapter {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async store(block: MemoryBlock): Promise<MemoryBlock> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert(blockToRow(block))
      .select()
      .single();

    if (error) throw new Error(`SupabaseAdapter.store failed: ${error.message}`);
    return rowToBlock(data);
  }

  /**
   * Full-text search over the `content` column using Postgres `ilike`.
   *
   * For production workloads with embeddings, replace this with a vector
   * similarity query against a `pgvector` column.
   */
  async retrieve(query: string, limit: number): Promise<MemoryBlock[]> {
    const keywords = query
      .split(/\s+/)
      .filter((w) => w.length > 2);

    let builder = this.client.from(TABLE).select('*');

    if (keywords.length > 0) {
      // Build an OR-chain of ilike clauses.
      const orClause = keywords
        .map((kw) => `content.ilike.%${kw}%`)
        .join(',');
      builder = builder.or(orClause);
    }

    const { data, error } = await builder
      .order('importance', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`SupabaseAdapter.retrieve failed: ${error.message}`);
    return (data ?? []).map(rowToBlock);
  }

  async update(
    id: string,
    partial: Partial<MemoryBlock>,
  ): Promise<MemoryBlock> {
    // Prevent callers from changing the primary key.
    const { id: _ignored, ...rest } = partial as Record<string, unknown>;

    const { data, error } = await this.client
      .from(TABLE)
      .update(rest)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`SupabaseAdapter.update failed: ${error.message}`);
    return rowToBlock(data);
  }

  async delete(id: string): Promise<boolean> {
    const { error, count } = await this.client
      .from(TABLE)
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw new Error(`SupabaseAdapter.delete failed: ${error.message}`);
    return (count ?? 0) > 0;
  }

  async getAll(): Promise<MemoryBlock[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`SupabaseAdapter.getAll failed: ${error.message}`);
    return (data ?? []).map(rowToBlock);
  }
}
