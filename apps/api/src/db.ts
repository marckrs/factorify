// Supabase client for the API

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set')
}

export const supabase = createClient(url, key)

// Store a task in the database
export async function createTask(req: {
  task:       string
  priority:   string
  product_id?: string
  context?:   string
  dry_run:    boolean
}): Promise<string> {
  const { data, error } = await supabase
    .from('factory_tasks')
    .insert({
      task:       req.task,
      priority:   req.priority,
      product_id: req.product_id ?? null,
      context:    req.context   ?? null,
      dry_run:    req.dry_run,
      status:     'queued',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create task: ${error.message}`)
  return (data as { id: string }).id
}

// Get task status
export async function getTask(id: string) {
  const { data, error } = await supabase
    .from('factory_tasks')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Task not found: ${error.message}`)
  return data
}
