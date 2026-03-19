// ============================================================
// Checkpoint Manager — ADR-009
// ============================================================
// Persists execution state after each wave so long-running tasks
// can resume from the last checkpoint on failure.
// ============================================================

import type { TaskResult } from '../core/types.js'

// Minimal Supabase client interface — avoids hard dependency
interface SupabaseClient {
  from(table: string): {
    upsert(data: Record<string, unknown>, opts?: { onConflict: string }): Promise<{ error: unknown }>
    select(cols: string): {
      eq(col: string, val: string): {
        order(col: string, opts: { ascending: boolean }): {
          limit(n: number): {
            single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
          }
        }
      }
    }
  }
}

export interface CheckpointData {
  wave_level:  number
  results:     Array<{
    task_id:     string
    status:      string
    output:      string
    duration_ms: number
  }>
}

export class CheckpointManager {
  private client: SupabaseClient | null

  constructor(client: SupabaseClient | null) {
    this.client = client
  }

  async save(params: {
    plan_id:    string
    session_id: string
    wave_level: number
    results:    TaskResult[]
  }): Promise<void> {
    if (!this.client) return

    await this.client
      .from('execution_checkpoints')
      .upsert({
        plan_id:    params.plan_id,
        session_id: params.session_id,
        wave_level: params.wave_level,
        state_json: {
          completed_results: params.results.map(r => ({
            task_id:     r.task_id,
            status:      r.status,
            output:      (r.output ?? '').slice(0, 2000),
            duration_ms: r.duration_ms,
          })),
          wave_level:      params.wave_level,
          checkpointed_at: new Date().toISOString(),
        },
      }, { onConflict: 'plan_id,wave_level' })

    console.log(JSON.stringify({
      level: 'info', event: 'checkpoint_saved',
      plan_id: params.plan_id, wave_level: params.wave_level,
      results: params.results.length,
    }))
  }

  async load(planId: string): Promise<CheckpointData | null> {
    if (!this.client) return null

    const { data } = await this.client
      .from('execution_checkpoints')
      .select('*')
      .eq('plan_id', planId)
      .order('wave_level', { ascending: false })
      .limit(1)
      .single()

    if (!data) return null

    const state = data.state_json as { completed_results: CheckpointData['results']; wave_level: number }
    return { wave_level: state.wave_level, results: state.completed_results }
  }
}
