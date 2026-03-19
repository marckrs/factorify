import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import type { FactoryTask } from './api'

export interface AgentLog {
  id: string; agent_type: string; task_preview?: string
  tokens_used?: number; estimated_cost_usd?: number
  cache_read_tokens?: number; cache_write_tokens?: number
  model_tier?: string; success: boolean; duration_ms?: number; created_at: string
}

export interface AgentLearning {
  id: string; category: string; agent_type: string; title: string
  description: string; importance: number; occurrences: number; created_at: string
}

export function useTasks(limit = 20) {
  const [tasks, setTasks] = useState<FactoryTask[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    const { data } = await supabase.from('factory_tasks').select('*').order('created_at', { ascending: false }).limit(limit)
    if (data) setTasks(data as FactoryTask[])
    setLoading(false)
  }, [limit])
  useEffect(() => {
    load()
    const ch = supabase.channel('tasks-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'factory_tasks' }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])
  return { tasks, loading, refetch: load }
}

export function useAgentLogs(limit = 50) {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    const { data } = await supabase.from('agents_log').select('*').order('created_at', { ascending: false }).limit(limit)
    if (data) setLogs(data as AgentLog[])
    setLoading(false)
  }, [limit])
  useEffect(() => {
    load()
    const ch = supabase.channel('logs-rt').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agents_log' }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])
  return { logs, loading, refetch: load }
}

export function useLearnings() {
  const [learnings, setLearnings] = useState<AgentLearning[]>([])
  useEffect(() => {
    supabase.from('agent_learnings').select('*').order('importance', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setLearnings(data as AgentLearning[]) })
  }, [])
  return learnings
}

export function useFinopsAlerts() {
  const [alerts, setAlerts] = useState<Array<{ id: string; alert_type: string; message: string; resolved: boolean; created_at: string }>>([])
  useEffect(() => {
    supabase.from('finops_alerts').select('*').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setAlerts(data as typeof alerts) })
  }, [])
  return { alerts, activeCount: alerts.filter(a => !a.resolved).length }
}

export function useApiHealth() {
  const [status, setStatus] = useState<'ok' | 'error' | 'loading'>('loading')
  const check = useCallback(async () => {
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/health`, { signal: AbortSignal.timeout(3000) })
      setStatus(r.ok ? 'ok' : 'error')
    } catch { setStatus('error') }
  }, [])
  useEffect(() => { check(); const t = setInterval(check, 30_000); return () => clearInterval(t) }, [check])
  return status
}
