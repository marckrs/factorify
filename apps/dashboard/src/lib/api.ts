const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const API_KEY  = import.meta.env.VITE_API_KEY  ?? ''

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':    API_KEY,
      ...opts?.headers,
    },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json()
}

export interface FactoryTask {
  id:           string
  task:         string
  priority:     string
  status:       'queued' | 'running' | 'completed' | 'failed'
  result?:      string
  error?:       string
  duration_ms?: number
  metadata?:    Record<string, unknown>
  created_at:   string
  updated_at:   string
}

export const api = {
  health: () => apiFetch<{ status: string; version: string; uptime: number }>('/health'),
  tasks: {
    list: () => apiFetch<{ tasks: FactoryTask[] }>('/tasks'),
    get:  (id: string) => apiFetch<FactoryTask>(`/tasks/${id}`),
    run:  (body: { task: string; priority?: string; dry_run?: boolean; context?: string }) =>
      apiFetch<{ task_id: string; status: string }>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  },
}
