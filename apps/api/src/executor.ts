// ============================================================
// Task Executor
// ============================================================
// Bridges the API layer with the MetaOrchestrator + LLM runner.
// Called by POST /tasks after storing the task in Supabase.
// Runs asynchronously — does not block the HTTP response.
// ============================================================

import { randomUUID }        from 'node:crypto'
import { Orchestrator }      from '@factory/orchestrator'
import type { Task, AgentSpec, TaskPriority } from '@factory/orchestrator'
import { LlmAgentRunner }   from './llm-runner.js'
import { supabase }          from './db.js'

// ── Agent registry ────────────────────────────────────────────
const AGENTS: AgentSpec[] = [
  { name: 'code-smith',     type: 'dev', capabilities: ['typescript', 'python', 'refactor'], autonomy_level: 'full' },
  { name: 'test-engineer',  type: 'dev', capabilities: ['vitest', 'pytest', 'coverage'],     autonomy_level: 'full' },
  { name: 'review-guard',   type: 'dev', capabilities: ['security', 'performance', 'adr'],   autonomy_level: 'full' },
  { name: 'infra-pilot',    type: 'ops', capabilities: ['vercel', 'docker', 'ci-cd'],        autonomy_level: 'supervised' },
  { name: 'biz-analyst',    type: 'biz', capabilities: ['metrics', 'okrs', 'reporting'],     autonomy_level: 'full' },
]

// ── Create LLM-powered runner ─────────────────────────────────
const llmRunner = new LlmAgentRunner({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model:  'claude-sonnet-4-20250514',
})

// ── Create orchestrator with LLM runner ───────────────────────
const orchestrator = new Orchestrator({
  agents:           AGENTS,
  concurrencyLimit: 3,
  runner:           llmRunner as never, // LlmAgentRunner implements the same interface
})

// ── Update task status in Supabase ────────────────────────────
async function updateTask(
  id:     string,
  fields: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from('factory_tasks')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
}

// ── Execute a task asynchronously ─────────────────────────────
export async function executeTask(params: {
  task_id:     string
  task:        string
  priority?:   string
  product_id?: string
  context?:    string
  dry_run?:    boolean
}): Promise<void> {
  const { task_id, task, priority, product_id, context, dry_run } = params
  const startTime = performance.now()

  // Mark as running
  await updateTask(task_id, { status: 'running' })

  try {
    // Build a Task object for the orchestrator
    const taskObj: Task = {
      id:           randomUUID(),
      description:  context ? `${task}\n\nContext: ${context}` : task,
      type:         'dev',
      priority:     (priority ?? 'normal') as TaskPriority,
      status:       'pending',
      dependencies: [],
      created_at:   new Date(),
    }

    // Phase 1: Plan
    const plan = orchestrator.plan(taskObj)

    console.log(JSON.stringify({
      level:    'info',
      event:    'plan_ready',
      task_id,
      plan_id:  plan.id,
      subtasks: plan.subtasks.length,
    }))

    // Store plan
    await updateTask(task_id, {
      plan: JSON.stringify({
        plan_id:        plan.id,
        subtask_count:  plan.subtasks.length,
        subtasks:       plan.subtasks.map(st => ({
          id:          st.id,
          type:        st.type,
          description: st.description.slice(0, 100),
          deps:        st.dependencies,
        })),
        estimated_ms:   plan.estimated_duration_ms,
      }),
    })

    if (dry_run) {
      await updateTask(task_id, {
        status:      'completed',
        result:      `Dry run — plan generated with ${plan.subtasks.length} subtasks. No execution.`,
        duration_ms: Math.round(performance.now() - startTime),
      })
      return
    }

    // Phase 2: Execute (calls Claude API for each subtask)
    const result = await orchestrator.execute(plan)

    const totalDuration = Math.round(performance.now() - startTime)

    console.log(JSON.stringify({
      level:       'info',
      event:       'execution_complete',
      task_id,
      plan_id:     result.plan_id,
      success:     result.success,
      duration_ms: totalDuration,
    }))

    // Store result
    await updateTask(task_id, {
      status:      result.success ? 'completed' : 'failed',
      result:      result.summary,
      duration_ms: totalDuration,
    })

    // Log to agents_log
    const subtaskResults = [...result.results.values()]
    await supabase.from('agents_log').insert({
      agent_type:     'orchestrator',
      task_preview:   task.slice(0, 100),
      output_preview: result.summary.slice(0, 200),
      session_id:     task_id,
      product_id:     product_id ?? null,
      block_weights:  subtaskResults.map(r => ({
        task_id:  r.task_id,
        status:   r.status,
        ms:       r.duration_ms,
        output:   (r.output ?? r.error ?? '').slice(0, 100),
      })),
      tokens_used:    0, // TODO: track from LLM responses
      duration_ms:    totalDuration,
      success:        result.success,
    })

  } catch (err) {
    const message = (err as Error).message
    console.error(JSON.stringify({
      level:   'error',
      event:   'task_failed',
      task_id,
      error:   message,
    }))

    await updateTask(task_id, {
      status:      'failed',
      error:       message,
      duration_ms: Math.round(performance.now() - startTime),
    })
  }
}
