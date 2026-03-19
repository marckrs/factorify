import { useAgentLogs } from '../lib/hooks'
import { AGENT_COLORS } from '../lib/design-tokens'

const ALL_AGENTS = [
  { id: 'code-smith', cluster: 'dev', model: 'Sonnet' },
  { id: 'test-engineer', cluster: 'dev', model: 'Haiku' },
  { id: 'review-guard', cluster: 'dev', model: 'Sonnet' },
  { id: 'infra-pilot', cluster: 'ops', model: 'Haiku' },
  { id: 'monitor', cluster: 'ops', model: 'Haiku' },
  { id: 'incident', cluster: 'ops', model: 'Sonnet' },
  { id: 'biz-analyst', cluster: 'biz', model: 'Haiku' },
  { id: 'gtm', cluster: 'biz', model: 'Sonnet' },
  { id: 'support', cluster: 'biz', model: 'Haiku' },
]

export function Agents() {
  const { logs } = useAgentLogs(500)

  const stats = ALL_AGENTS.map(a => {
    const al = logs.filter(l => l.agent_type === a.id)
    const ok = al.filter(l => l.success).length
    const cost = al.reduce((s, l) => s + (l.estimated_cost_usd ?? 0), 0)
    return { ...a, total: al.length, ok, rate: al.length ? Math.round(ok / al.length * 100) : null, cost }
  })

  return (
    <div className="p-5">
      <div className="grid grid-cols-3 gap-3 mb-6">
        {['dev', 'ops', 'biz'].map(c => {
          const cs = stats.filter(s => s.cluster === c)
          const t = cs.reduce((s, a) => s + a.total, 0)
          const o = cs.reduce((s, a) => s + a.ok, 0)
          return (
            <div key={c} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">cluster {c}</div>
              <div className="text-xl font-medium">{t > 0 ? `${Math.round(o / t * 100)}%` : '-'}</div>
              <div className="text-[11px] text-zinc-600">{t} execucoes</div>
            </div>
          )
        })}
      </div>

      <div className="space-y-1.5">
        {stats.map(a => (
          <div key={a.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: AGENT_COLORS[a.id] }} />
            <div className="font-medium text-[13px] w-28">{a.id}</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">{a.cluster}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500">{a.model}</span>
            <div className="flex-1 h-1 bg-zinc-800 rounded-full mx-2 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${a.rate ?? 0}%`, background: AGENT_COLORS[a.id] }} />
            </div>
            <div className="text-[12px] font-medium w-10 text-right" style={{ color: a.rate && a.rate > 90 ? '#1D9E75' : '#888' }}>
              {a.rate !== null ? `${a.rate}%` : '-'}
            </div>
            <div className="text-[11px] text-zinc-600 w-16 text-right">{a.total} tasks</div>
            <div className="text-[11px] text-zinc-600 w-14 text-right">{a.cost > 0 ? `$${a.cost.toFixed(3)}` : '-'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
