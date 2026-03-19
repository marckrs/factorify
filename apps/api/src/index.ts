// Factorify API — main entry point
// Endpoint de entrada de tarefas para o Meta-Orchestrator

import Fastify  from 'fastify'
import cors     from '@fastify/cors'
import helmet   from '@fastify/helmet'
import { createTask, getTask } from './db.js'
import { executeTask }         from './executor.js'
import type {
  CreateTaskRequest, TaskResponse,
  TaskStatusResponse, HealthResponse,
} from './types.js'

const app     = Fastify({ logger: { level: 'info' } })
const VERSION = '0.2.0'
const START   = Date.now()

await app.register(cors,   { origin: true })
await app.register(helmet, { contentSecurityPolicy: false })

// ── Validate env on startup ───────────────────────────────────
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ANTHROPIC_API_KEY']
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(JSON.stringify({ level: 'fatal', event: 'missing_env', key }))
    process.exit(1)
  }
}

// ── Auth middleware ───────────────────────────────────────────
app.addHook('onRequest', async (req, reply) => {
  if (req.url === '/health') return

  const apiKey  = req.headers['x-api-key']
  const expected = process.env.FACTORY_API_KEY

  if (expected && apiKey !== expected) {
    reply.status(401).send({ error: 'Invalid API key' })
  }
})

// ── GET /health ───────────────────────────────────────────────
app.get<{ Reply: HealthResponse }>('/health', async () => ({
  status:  'ok',
  version: VERSION,
  uptime:  Math.floor((Date.now() - START) / 1000),
}))

// ── POST /tasks ───────────────────────────────────────────────
app.post<{ Body: CreateTaskRequest; Reply: TaskResponse }>('/tasks', {
  schema: {
    body: {
      type: 'object',
      required: ['task'],
      properties: {
        task:       { type: 'string', minLength: 10, maxLength: 2000 },
        priority:   { type: 'string', enum: ['critical','high','normal','low'] },
        product_id: { type: 'string' },
        context:    { type: 'string', maxLength: 5000 },
        dry_run:    { type: 'boolean' },
      },
    },
  },
}, async (req, reply) => {
  const { task, priority, product_id, context, dry_run } = req.body

  // 1. Store task in Supabase (status: queued)
  const task_id = await createTask({
    task,
    priority:   priority ?? 'normal',
    product_id,
    context,
    dry_run:    dry_run ?? false,
  })

  // 2. Fire-and-forget — orchestrator runs async
  setImmediate(() => {
    executeTask({ task_id, task, priority, product_id, context, dry_run })
      .catch(err => console.error(JSON.stringify({
        level: 'error', event: 'execute_error', task_id, error: String(err),
      })))
  })

  // 3. Return immediately with task_id
  reply.status(202).send({
    task_id,
    status:     'queued',
    message:    'Task accepted. Poll GET /tasks/:id for status.',
    created_at: new Date().toISOString(),
  })
})

// ── GET /tasks/:id ────────────────────────────────────────────
app.get<{
  Params: { id: string }
  Reply: TaskStatusResponse | { error: string }
}>('/tasks/:id', async (req, reply) => {
  try {
    const task = await getTask(req.params.id)
    reply.send(task as TaskStatusResponse)
  } catch {
    reply.status(404).send({ error: 'Task not found' })
  }
})

// ── GET /tasks ────────────────────────────────────────────────
app.get('/tasks', async (_req, reply) => {
  const { supabase } = await import('./db.js')
  const { data } = await supabase
    .from('factory_tasks')
    .select('id, task, priority, status, duration_ms, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(20)
  reply.send({ tasks: data ?? [] })
})

// ── Start ─────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'

try {
  await app.listen({ port, host })
  console.log(JSON.stringify({
    level:   'info',
    event:   'server_started',
    version: VERSION,
    port,
    env: {
      supabase:   !!process.env.SUPABASE_URL,
      anthropic:  !!process.env.ANTHROPIC_API_KEY,
      api_key:    !!process.env.FACTORY_API_KEY,
    },
  }))
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
