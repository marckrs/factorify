// HTTP client for the Factorify API

const API_BASE = process.env.FACTORY_API_URL ?? 'http://localhost:3001'
const API_KEY  = process.env.FACTORY_API_KEY  ?? ''

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':    API_KEY,
      ...opts?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json()
}

export async function submitTask(params: {
  task:       string
  priority?:  string
  dry_run?:   boolean
  context?:   string
}): Promise<{ task_id: string; status: string }> {
  return apiFetch('/tasks', {
    method: 'POST',
    body:   JSON.stringify(params),
  }) as Promise<{ task_id: string; status: string }>
}

export async function getTaskStatus(taskId: string): Promise<{
  id:          string
  task:        string
  status:      string
  result?:     string
  error?:      string
  duration_ms?: number
}> {
  return apiFetch(`/tasks/${taskId}`) as Promise<{
    id: string; task: string; status: string;
    result?: string; error?: string; duration_ms?: number
  }>
}

export async function listTasks(): Promise<{
  tasks: Array<{
    id: string; task: string; status: string;
    priority: string; duration_ms?: number; created_at: string
  }>
}> {
  return apiFetch('/tasks') as Promise<{
    tasks: Array<{
      id: string; task: string; status: string;
      priority: string; duration_ms?: number; created_at: string
    }>
  }>
}

export async function checkHealth(): Promise<{
  status: string; version: string; uptime: number
}> {
  return apiFetch('/health') as Promise<{
    status: string; version: string; uptime: number
  }>
}
