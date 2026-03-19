// Vercel serverless handler — standalone (no workspace deps)
// Full LLM execution runs locally; this serves health + task CRUD
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key')
}

function checkAuth(req: VercelRequest): boolean {
  const expected = process.env.FACTORY_API_KEY
  if (!expected) return true
  return req.headers['x-api-key'] === expected
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') { res.status(200).end(); return }

  const path = req.url?.split('?')[0] ?? '/'

  // Health
  if (path === '/health' || path === '/api/health') {
    res.json({ status: 'ok', version: '0.2.0', mode: 'serverless' })
    return
  }

  // Auth check for all other routes
  if (!checkAuth(req)) {
    res.status(401).json({ error: 'Invalid API key' })
    return
  }

  // GET /tasks — list
  if (req.method === 'GET' && (path === '/tasks' || path === '/api/tasks')) {
    const { data } = await supabase
      .from('factory_tasks')
      .select('id, task, priority, status, duration_ms, metadata, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(20)
    res.json({ tasks: data ?? [] })
    return
  }

  // GET /tasks/:id
  const taskMatch = path.match(/\/(?:api\/)?tasks\/([0-9a-f-]+)/)
  if (req.method === 'GET' && taskMatch) {
    const { data, error } = await supabase
      .from('factory_tasks')
      .select('*')
      .eq('id', taskMatch[1])
      .single()
    if (error) { res.status(404).json({ error: 'Task not found' }); return }
    res.json(data)
    return
  }

  // POST /tasks — create (queued only — LLM execution needs local API)
  if (req.method === 'POST' && (path === '/tasks' || path === '/api/tasks')) {
    const body = req.body ?? {}
    if (!body.task || body.task.length < 10) {
      res.status(400).json({ error: 'Task must be at least 10 characters' })
      return
    }

    const { data, error } = await supabase
      .from('factory_tasks')
      .insert({
        task:       body.task,
        priority:   body.priority ?? 'normal',
        product_id: body.product_id ?? null,
        context:    body.context ?? null,
        dry_run:    body.dry_run ?? false,
        status:     'queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) { res.status(500).json({ error: error.message }); return }

    res.status(202).json({
      task_id:    (data as { id: string }).id,
      status:     'queued',
      message:    'Task queued. Note: LLM execution requires local API server.',
      created_at: new Date().toISOString(),
    })
    return
  }

  res.status(404).json({ error: 'Not found' })
}
