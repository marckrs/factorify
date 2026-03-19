// Task request types for the Factorify API

export type Priority = 'critical' | 'high' | 'normal' | 'low'

export interface CreateTaskRequest {
  task:        string       // natural language description
  priority?:   Priority     // default: 'normal'
  product_id?: string       // which product context (optional)
  context?:    string       // additional context for the orchestrator
  dry_run?:    boolean      // plan only, no execution
}

export interface TaskResponse {
  task_id:    string
  status:     'queued' | 'running' | 'completed' | 'failed'
  message:    string
  created_at: string
}

export interface TaskStatusResponse {
  task_id:      string
  status:       'queued' | 'running' | 'completed' | 'failed'
  plan?:        string
  result?:      string
  error?:       string
  duration_ms?: number
  created_at:   string
  updated_at:   string
}

export interface HealthResponse {
  status:  'ok'
  version: string
  uptime:  number
}
