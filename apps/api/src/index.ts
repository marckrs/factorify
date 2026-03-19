// Factorify API — main entry point
// Endpoint de entrada de tarefas para o Meta-Orchestrator

import Fastify from 'fastify'
import cors    from '@fastify/cors'
import helmet  from '@fastify/helmet'
import { createTask, getTask } from './db.js'
import type {
  CreateTaskRequest, TaskResponse,
  TaskStatusResponse, HealthResponse,
} from './types.js'

const app     = Fastify({ logger: true })
const VERSION = '0.1.0'
const START   = Date.now()

await app.register(cors,   { origin: true })
await app.register(helmet, { contentSecurityPolicy: false })

// ── Auth middleware ──────────────────────────────────────────
// Simple API key check — replace with proper JWT in production
app.addHook('onRequest', async (req, reply) => {
  if (req.url === '/health') return  // health check is public

  const apiKey = req.headers['x-api-key']
  const expected = process.env.FACTORY_API_KEY

  if (!expected) {
    req.log.warn('FACTORY_API_KEY not set — running in open mode')
    return
  }

  if (apiKey !== expected) {
    reply.status(401).send({ error: 'Invalid API key' })
  }
})

// ── Health check ─────────────────────────────────────────────
app.get<{ Reply: HealthResponse }>('/health', async () => ({
  status:  'ok',
  version: VERSION,
  uptime:  Math.floor((Date.now() - START) / 1000),
}))

// ── POST /tasks — create a new task ──────────────────────────
app.post<{
  Body:  CreateTaskRequest
  Reply: TaskResponse
}>('/tasks', {
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
  const body = req.body

  // Create task in DB (queued state)
  const task_id = await createTask({
    task:       body.task,
    priority:   body.priority ?? 'normal',
    product_id: body.product_id,
    context:    body.context,
    dry_run:    body.dry_run ?? false,
  })

  // TODO (Sprint 2): trigger orchestrator execution here
  // For now, task is stored as 'queued' and logged
  req.log.info({ task_id, task: body.task.slice(0, 80) }, 'Task queued')

  reply.status(202).send({
    task_id,
    status:     'queued',
    message:    'Task queued successfully. Use GET /tasks/:id to check status.',
    created_at: new Date().toISOString(),
  })
})

// ── GET /tasks/:id — get task status ─────────────────────────
app.get<{
  Params: { id: string }
  Reply:  TaskStatusResponse | { error: string }
}>('/tasks/:id', async (req, reply) => {
  try {
    const task = await getTask(req.params.id)
    reply.send(task as TaskStatusResponse)
  } catch {
    reply.status(404).send({ error: 'Task not found' })
  }
})

// ── GET /tasks — list recent tasks ───────────────────────────
app.get('/tasks', async (_req, reply) => {
  const { supabase } = await import('./db.js')
  const { data } = await supabase
    .from('factory_tasks')
    .select('id, task, priority, status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(20)

  reply.send({ tasks: data ?? [] })
})

// ── Start ────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'

try {
  await app.listen({ port, host })
  console.log(`Factorify API running on http://${host}:${port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
