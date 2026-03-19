import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, key)

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface FactoryTask {
  id:          string
  task:        string
  priority:    string
  status:      TaskStatus
  duration_ms: number | null
  created_at:  string
  updated_at:  string
}

export interface AgentLog {
  id:                 string
  agent_type:         string
  task_preview:       string | null
  tokens_used:        number | null
  estimated_cost_usd: number | null
  cache_read_tokens:  number | null
  success:            boolean
  duration_ms:        number | null
  created_at:         string
}
