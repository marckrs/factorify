import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import type { FactoryTask, AgentLog } from './lib/supabase'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  queued:    { bg: 'bg-blue-900/30',   text: 'text-blue-400',   label: 'Queued'    },
  running:   { bg: 'bg-yellow-900/30', text: 'text-yellow-400', label: 'Running'   },
  completed: { bg: 'bg-green-900/30',  text: 'text-green-400',  label: 'Completed' },
  failed:    { bg: 'bg-red-900/30',    text: 'text-red-400',    label: 'Failed'    },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.queued
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function MetricCard({ label, value, sub }: {
  label: string; value: string | number; sub?: string
}) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-medium text-zinc-100">{value}</div>
      {sub && <div className="text-xs text-zinc-600 mt-1">{sub}</div>}
    </div>
  )
}

export default function App() {
  const [tasks,     setTasks]     = useState<FactoryTask[]>([])
  const [logs,      setLogs]      = useState<AgentLog[]>([])
  const [apiStatus, setApiStatus] = useState<'ok' | 'error' | 'loading'>('loading')
  const [lastSync,  setLastSync]  = useState<Date>(new Date())

  const loadData = useCallback(async () => {
    const [{ data: taskData }, { data: logData }] = await Promise.all([
      supabase.from('factory_tasks').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('agents_log').select('*').order('created_at', { ascending: false }).limit(10),
    ])
    if (taskData) setTasks(taskData as FactoryTask[])
    if (logData)  setLogs(logData as AgentLog[])
    setLastSync(new Date())
  }, [])

  const checkApi = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3000) })
      setApiStatus(res.ok ? 'ok' : 'error')
    } catch {
      setApiStatus('error')
    }
  }, [])

  useEffect(() => {
    loadData()
    checkApi()

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'factory_tasks' }, () => loadData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agents_log' }, () => loadData())
      .subscribe()

    const poll = setInterval(() => { loadData(); checkApi() }, 30_000)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [loadData, checkApi])

  const completed   = tasks.filter(t => t.status === 'completed').length
  const failed      = tasks.filter(t => t.status === 'failed').length
  const running     = tasks.filter(t => t.status === 'running').length
  const successRate = tasks.length ? Math.round(completed / tasks.length * 100) : 0
  const totalCost   = logs.reduce((s, l) => s + (l.estimated_cost_usd ?? 0), 0)
  const withDuration = tasks.filter(t => t.duration_ms)
  const avgDuration = withDuration.length
    ? Math.round(withDuration.reduce((s, t) => s + (t.duration_ms ?? 0), 0) / withDuration.length / 1000)
    : 0

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-medium">Factorify</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Autonomous SaaS Factory — Control Panel</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>
            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
              apiStatus === 'ok' ? 'bg-green-500' : apiStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            API {apiStatus === 'ok' ? 'online' : apiStatus === 'error' ? 'offline' : '...'}
          </span>
          <span>Updated {lastSync.toLocaleTimeString('pt-BR')}</span>
          {running > 0 && (
            <span className="text-yellow-400 animate-pulse">{running} running</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <MetricCard label="Total tasks" value={tasks.length} sub={`${completed} completed`} />
        <MetricCard label="Success rate" value={`${successRate}%`} sub={`${failed} failed`} />
        <MetricCard label="Avg duration" value={`${avgDuration}s`} sub="per task" />
        <MetricCard label="Est. cost" value={`$${totalCost.toFixed(3)}`} sub="last 10 executions" />
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Recent tasks</h2>
          <button onClick={loadData} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Refresh</button>
        </div>
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-sm text-zinc-600 py-8 text-center">No tasks yet</div>
          ) : tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
              <span className="text-xs text-zinc-600 font-mono min-w-[60px]">{task.id.slice(0, 8)}</span>
              <span className="flex-1 text-sm truncate">{task.task}</span>
              <StatusBadge status={task.status} />
              <span className="text-xs text-zinc-600 min-w-[50px] text-right">
                {task.duration_ms ? `${(task.duration_ms / 1000).toFixed(1)}s` : '-'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Agent executions</h2>
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5">
              <span className={`text-xs font-mono min-w-[80px] ${log.success ? 'text-green-500' : 'text-red-500'}`}>
                {log.agent_type}
              </span>
              <span className="flex-1 text-xs text-zinc-400 truncate">{log.task_preview ?? '-'}</span>
              <span className="text-xs text-zinc-600">{log.tokens_used ? `${log.tokens_used.toLocaleString()} tok` : '-'}</span>
              <span className="text-xs text-zinc-600">{log.estimated_cost_usd ? `$${log.estimated_cost_usd.toFixed(4)}` : '-'}</span>
              <span className="text-xs text-zinc-600">{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
