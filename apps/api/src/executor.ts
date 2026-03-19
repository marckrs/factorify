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
import { LearningLayer }    from '@factory/attnres-memory'
import { SupabaseAdapter }   from '@factory/attnres-memory'
import { createClient }      from '@supabase/supabase-js'
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

// Map task type to agent name for LearningLayer
const TYPE_TO_AGENT: Record<string, string> = {
  dev: 'code-smith',
  ops: 'infra-pilot',
  biz: 'biz-analyst',
}

// ── Create LLM-powered runner ─────────────────────────────────
const llmRunner = new LlmAgentRunner({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model:  'claude-sonnet-4-20250514',
})

// ── Create orchestrator with LLM runner ───────────────────────
const orchestrator = new Orchestrator({
  agents:           AGENTS,
  concurrencyLimit: 3,
  runner:           llmRunner as never,
})

// ── Create LearningLayer (Reflexion + AttnRes) ────────────────
const learningClient = {
  messages: {
    async create(p: { model: string; max_tokens: number; system: string; messages: Array<{ role: string; content: string }> }) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
      return client.messages.create({
        model:      p.model,
        max_tokens: p.max_tokens,
        system:     p.system,
        messages:   p.messages as Array<{ role: 'user' | 'assistant'; content: string }>,
      })
    }
  }
}

const learningAdapter = new SupabaseAdapter(
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
)

const learningLayer = new LearningLayer(
  learningClient,
  learningAdapter,
  'claude-sonnet-4-20250514',
)

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

    // Build subtask lookup for LearningLayer (id → type/description)
    const subtaskMap = new Map(
      plan.subtasks.map(st => [st.id, { type: st.type, description: st.description }])
    )

    // Phase 2: Execute (calls Claude API for each subtask)
    llmRunner.clearTokenTracking()
    const result = await orchestrator.execute(plan)

    const totalDuration = Math.round(performance.now() - startTime)

    // Aggregate token usage from LLM runner
    const tokenTotals = llmRunner.getTotalTokenUsage()

    console.log(JSON.stringify({
      level:           'info',
      event:           'execution_complete',
      task_id,
      plan_id:         result.plan_id,
      success:         result.success,
      duration_ms:     totalDuration,
      total_tokens:    tokenTotals.total_tokens,
      total_cost_usd:  Math.round(tokenTotals.total_cost_usd * 10000) / 10000,
      cache_write:     tokenTotals.cache_write,
      cache_read:      tokenTotals.cache_read,
    }))

    // Store result
    await updateTask(task_id, {
      status:      result.success ? 'completed' : 'failed',
      result:      result.summary,
      duration_ms: totalDuration,
    })

    // Log to agents_log with real token data
    const subtaskResults = [...result.results.values()]
    await supabase.from('agents_log').insert({
      agent_type:         'orchestrator',
      task_preview:       task.slice(0, 100),
      output_preview:     result.summary.slice(0, 200),
      session_id:         task_id,
      product_id:         product_id ?? null,
      block_weights:      subtaskResults.map(r => {
        const tu = llmRunner.getTokenUsage(r.task_id)
        return {
          task_id:  r.task_id,
          status:   r.status,
          ms:       r.duration_ms,
          tokens:   tu ? tu.input_tokens + tu.output_tokens : 0,
          cost_usd: tu ? Math.round(tu.cost_usd * 10000) / 10000 : 0,
        }
      }),
      tokens_used:        tokenTotals.total_tokens,
      estimated_cost_usd: Math.round(tokenTotals.total_cost_usd * 10000) / 10000,
      cache_write_tokens: tokenTotals.cache_write,
      cache_read_tokens:  tokenTotals.cache_read,
      duration_ms:        totalDuration,
      success:            result.success,
    })

    // Phase 3: Learning — analyze each subtask result (fire-and-forget)
    setImmediate(() => {
      void analyzeLearnings(subtaskResults, subtaskMap, task, task_id, priority)
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

// ── LearningLayer analysis (fire-and-forget) ──────────────────
async function analyzeLearnings(
  subtaskResults: Array<{ task_id: string; status: string; output?: string; error?: string; duration_ms: number }>,
  subtaskMap:     Map<string, { type: string; description: string }>,
  task:           string,
  taskId:         string,
  priority?:      string,
): Promise<void> {
  for (const r of subtaskResults) {
    const stInfo = subtaskMap.get(r.task_id)
    const agent  = TYPE_TO_AGENT[stInfo?.type ?? 'dev'] ?? 'code-smith'

    try {
      const analysis = await learningLayer.analyze(
        {
          id:          r.task_id,
          description: stInfo?.description ?? task.slice(0, 500),
          type:        stInfo?.type ?? 'dev',
          agent,
          priority:    priority ?? 'normal',
        },
        {
          task_id:     r.task_id,
          status:      r.status,
          output:      r.output,
          error:       r.error,
          duration_ms: r.duration_ms,
          success:     r.status === 'completed',
        },
        taskId,
      )

      if (analysis.has_learning) {
        console.log(JSON.stringify({
          level:   'info',
          event:   'learning_captured',
          task_id: taskId,
          agent,
          count:   analysis.learnings.length,
          summary: analysis.summary,
        }))

        // Persist to agent_learnings table
        for (const learning of analysis.learnings) {
          await supabase.from('agent_learnings').upsert({
            learning_id: learning.id,
            category:    learning.category,
            agent_type:  learning.agent,
            title:       learning.title,
            description: learning.description,
            context:     learning.context,
            evidence:    learning.evidence,
            importance:  learning.importance,
            occurrences: learning.occurrences,
            pattern_key: `${learning.agent}::${learning.title.toLowerCase().replace(/\s+/g, '_')}`.slice(0, 80),
            session_id:  taskId,
            last_seen:   new Date().toISOString(),
          }, { onConflict: 'learning_id' })
        }
      }
    } catch {
      // LearningLayer never crashes the pipeline
    }
  }
}
