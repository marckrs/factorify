import { useTasks, useAgentLogs, useFinopsAlerts } from '../lib/hooks'
import { AGENT_COLORS } from '../lib/design-tokens'

function Card({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
      <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-medium" style={color ? { color } : {}}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-600 mt-1">{sub}</div>}
    </div>
  )
}

export function Overview() {
  const { tasks } = useTasks(100)
  const { logs }  = useAgentLogs(200)
  const { activeCount } = useFinopsAlerts()

  const completed = tasks.filter(t => t.status === 'completed').length
  const rate = tasks.length ? Math.round(completed / tasks.length * 100) : 0
  const cost = logs.reduce((s, l) => s + (l.estimated_cost_usd ?? 0), 0)
  const withTime = tasks.filter(t => t.duration_ms)
  const avgSec = withTime.length ? Math.round(withTime.reduce((s, t) => s + (t.duration_ms!), 0) / withTime.length / 1000) : 0

  const agentStats = logs.reduce((acc, l) => {
    if (!acc[l.agent_type]) acc[l.agent_type] = { total: 0, ok: 0 }
    acc[l.agent_type].total++
    if (l.success) acc[l.agent_type].ok++
    return acc
  }, {} as Record<string, { total: number; ok: number }>)

  return (
    <div className="p-5">
      {activeCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-amber-800/50 bg-amber-900/20 mb-5 text-[13px] text-amber-400">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="flex-1"><strong>{activeCount} alerta{activeCount > 1 ? 's' : ''} FinOps</strong></span>
          <a href="/finops" className="text-[11px] underline">Ver</a>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card label="Tasks total" value={tasks.length} sub={`${completed} concluidas`} />
        <Card label="Success rate" value={`${rate}%`} color={rate > 85 ? '#1D9E75' : '#EF9F27'} />
        <Card label="Avg duration" value={`${avgSec}s`} sub="por task" />
        <Card label="Custo total" value={`$${cost.toFixed(3)}`} sub="todas execucoes" />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <div>
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Tasks recentes</div>
          <div className="space-y-1.5">
            {tasks.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5">
                <span className="text-[11px] text-zinc-600 font-mono w-16">{t.id.slice(0, 8)}</span>
                <span className="flex-1 text-[13px] truncate">{t.task.slice(0, 60)}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  t.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                  t.status === 'running' ? 'bg-yellow-900/30 text-yellow-400' :
                  t.status === 'failed' ? 'bg-red-900/30 text-red-400' : 'bg-zinc-800 text-zinc-500'
                }`}>{t.status}</span>
                <span className="text-[11px] text-zinc-600 w-12 text-right">{t.duration_ms ? `${(t.duration_ms / 1000).toFixed(1)}s` : '-'}</span>
              </div>
            ))}
            {tasks.length === 0 && <div className="text-[13px] text-zinc-600 py-6 text-center">Sem tasks ainda</div>}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Agentes</div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2.5">
            {Object.entries(agentStats).length === 0
              ? <div className="text-[12px] text-zinc-600">Nenhuma execucao</div>
              : Object.entries(agentStats).slice(0, 7).map(([agent, s]) => {
                const pct = s.total ? Math.round(s.ok / s.total * 100) : 0
                return (
                  <div key={agent} className="flex items-center gap-2 text-[12px]">
                    <div className="w-20 font-medium text-zinc-300">{agent}</div>
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: AGENT_COLORS[agent] ?? '#888' }} />
                    </div>
                    <div className="text-zinc-500 w-9 text-right">{pct}%</div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
