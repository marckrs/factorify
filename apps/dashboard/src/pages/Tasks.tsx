import { useState } from 'react'
import { useTasks } from '../lib/hooks'
import { api } from '../lib/api'

type Filter = 'all' | 'running' | 'completed' | 'failed' | 'queued'

export function Tasks() {
  const { tasks, loading, refetch } = useTasks(50)
  const [filter, setFilter] = useState<Filter>('all')
  const [taskText, setTaskText] = useState('')
  const [priority, setPriority] = useState('normal')
  const [dryRun, setDryRun] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!taskText.trim() || submitting) return
    setSubmitting(true)
    try {
      await api.tasks.run({ task: taskText, priority, dry_run: dryRun })
      setTaskText('')
      setTimeout(refetch, 1000)
    } catch (e) { alert((e as Error).message) }
    finally { setSubmitting(false) }
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)
  const counts: Record<Filter, number> = {
    all: tasks.length, running: tasks.filter(t => t.status === 'running').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
    queued: tasks.filter(t => t.status === 'queued').length,
  }

  return (
    <div className="p-5">
      <div className="flex gap-2 mb-5">
        <input value={taskText} onChange={e => setTaskText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Descreva a task em linguagem natural..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
        <select value={priority} onChange={e => setPriority(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-[13px] text-zinc-300">
          <option value="normal">Normal</option><option value="high">High</option>
          <option value="critical">Critical</option><option value="low">Low</option>
        </select>
        <label className="flex items-center gap-2 text-[13px] text-zinc-400 cursor-pointer">
          <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} className="rounded" /> Dry run
        </label>
        <button onClick={submit} disabled={submitting || !taskText.trim()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[13px] font-medium rounded-lg transition-colors">
          {submitting ? 'Enviando...' : 'Executar'}
        </button>
      </div>

      <div className="flex border-b border-zinc-800 mb-4">
        {(['all', 'running', 'completed', 'failed', 'queued'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-[13px] border-b-2 transition-colors ${
              filter === f ? 'border-purple-500 text-zinc-100 font-medium' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {counts[f] > 0 && <span className="ml-1.5 text-[11px] text-zinc-600">({counts[f]})</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="text-[13px] text-zinc-600 py-8 text-center">Carregando...</div>
       : filtered.length === 0 ? <div className="text-[13px] text-zinc-600 py-8 text-center">Nenhuma task</div>
       : <div className="space-y-1.5">
          {filtered.map(t => (
            <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[11px] text-zinc-600 font-mono">{t.id.slice(0, 8)}</span>
                <span className="flex-1 text-[13px]">{t.task}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  t.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                  t.status === 'running' ? 'bg-yellow-900/30 text-yellow-400' :
                  t.status === 'failed' ? 'bg-red-900/30 text-red-400' : 'bg-zinc-800 text-zinc-500'
                }`}>{t.status}</span>
                <span className="text-[11px] text-zinc-600">{t.duration_ms ? `${(t.duration_ms / 1000).toFixed(1)}s` : '-'}</span>
              </div>
              {(t.metadata as Record<string, unknown>)?.requires_review ? (
                <div className="text-[11px] text-amber-400 mt-1">Confidence {String(((t.metadata as Record<string, unknown>)?.confidence_score as number)?.toFixed(2))} - abaixo do threshold</div>
              ) : null}
              {t.result && <div className="text-[11px] text-zinc-500 mt-1 font-mono truncate">{t.result.slice(0, 120)}</div>}
              {t.error && <div className="text-[11px] text-red-400 mt-1">{t.error}</div>}
            </div>
          ))}
        </div>}
    </div>
  )
}
