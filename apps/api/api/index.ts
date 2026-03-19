// Vercel serverless handler — wraps Fastify for serverless execution
import type { VercelRequest, VercelResponse } from '@vercel/node'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { createTask, getTask } from '../src/db.js'
import { executeTask } from '../src/executor.js'
import type { CreateTaskRequest, HealthResponse } from '../src/types.js'

const app = Fastify({ logger: false })
const VERSION = '0.2.0'
const START = Date.now()

let initialized = false

async function init() {
  if (initialized) return
  await app.register(cors, { origin: true })
  await app.register(helmet, { contentSecurityPolicy: false })

  app.addHook('onRequest', async (req, reply) => {
    if (req.url === '/health' || req.url === '/api/health') return
    const apiKey = req.headers['x-api-key']
    const expected = process.env.FACTORY_API_KEY
    if (expected && apiKey !== expected) {
      reply.status(401).send({ error: 'Invalid API key' })
    }
  })

  app.get('/health', async () => ({
    status: 'ok', version: VERSION, uptime: Math.floor((Date.now() - START) / 1000),
  } satisfies HealthResponse))

  app.post<{ Body: CreateTaskRequest }>('/tasks', async (req, reply) => {
    const { task, priority, product_id, context, dry_run } = req.body ?? {} as CreateTaskRequest
    if (!task || task.length < 10) {
      reply.status(400).send({ error: 'Task must be at least 10 characters' })
      return
    }
    const task_id = await createTask({
      task, priority: priority ?? 'normal', product_id, context, dry_run: dry_run ?? false,
    })
    setImmediate(() => {
      executeTask({ task_id, task, priority, product_id, context, dry_run })
        .catch(err => console.error({ event: 'execute_error', task_id, error: String(err) }))
    })
    reply.status(202).send({
      task_id, status: 'queued',
      message: 'Task accepted. Poll GET /tasks/:id for status.',
      created_at: new Date().toISOString(),
    })
  })

  app.get<{ Params: { id: string } }>('/tasks/:id', async (req, reply) => {
    try {
      const task = await getTask(req.params.id)
      reply.send(task)
    } catch { reply.status(404).send({ error: 'Task not found' }) }
  })

  app.get('/tasks', async (_req, reply) => {
    const { supabase } = await import('../src/db.js')
    const { data } = await supabase
      .from('factory_tasks')
      .select('id, task, priority, status, duration_ms, metadata, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(20)
    reply.send({ tasks: data ?? [] })
  })

  await app.ready()
  initialized = true
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validate env on first call
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ANTHROPIC_API_KEY']) {
    if (!process.env[key]) {
      res.status(500).json({ error: `Missing env: ${key}` })
      return
    }
  }

  await init()
  await app.ready()
  app.server.emit('request', req, res)
}
