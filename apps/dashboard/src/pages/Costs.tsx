import { useAgentLogs } from '../lib/hooks'
import { AGENT_COLORS, MODEL_TIER_COLORS } from '../lib/design-tokens'

export function Costs() {
  const { logs } = useAgentLogs(500)
  const totalCost = logs.reduce((s, l) => s + (l.estimated_cost_usd ?? 0), 0)
  const totalTok = logs.reduce((s, l) => s + (l.tokens_used ?? 0), 0)
  const cacheRead = logs.reduce((s, l) => s + (l.cache_read_tokens ?? 0), 0)
  const cachePct = totalTok > 0 ? Math.round(cacheRead / totalTok * 100) : 0

  const byAgent = logs.reduce((acc, l) => { acc[l.agent_type] = (acc[l.agent_type] ?? 0) + (l.estimated_cost_usd ?? 0); return acc }, {} as Record<string, number>)
  const topAgents = Object.entries(byAgent).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const byTier = logs.reduce((acc, l) => { const t = l.model_tier ?? 'sonnet'; acc[t] = (acc[t] ?? 0) + (l.estimated_cost_usd ?? 0); return acc }, {} as Record<string, number>)

  return (
    <div className="p-5">
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Total</div>
          <div className="text-2xl font-medium">${totalCost.toFixed(3)}</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Tokens</div>
          <div className="text-2xl font-medium">{(totalTok / 1000).toFixed(1)}k</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Cache savings</div>
          <div className="text-2xl font-medium text-green-400">{cachePct}%</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Por execucao</div>
          <div className="text-2xl font-medium">{logs.length > 0 ? `$${(totalCost / logs.length).toFixed(4)}` : '-'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Custo por agente</div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            {topAgents.length === 0 ? <div className="text-[12px] text-zinc-600">Sem dados</div>
            : topAgents.map(([agent, cost]) => (
              <div key={agent} className="flex items-center gap-3 text-[12px]">
                <div className="w-24 font-medium text-zinc-300">{agent}</div>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(cost / topAgents[0][1]) * 100}%`, background: AGENT_COLORS[agent] ?? '#888' }} />
                </div>
                <div className="text-zinc-500 w-16 text-right">${cost.toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Custo por modelo</div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            {Object.entries(byTier).map(([tier, cost]) => (
              <div key={tier} className="flex items-center gap-3 text-[12px]">
                <div className="w-20 font-medium text-zinc-300">{tier}</div>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${totalCost > 0 ? (cost / totalCost) * 100 : 0}%`, background: MODEL_TIER_COLORS[tier] ?? '#888' }} />
                </div>
                <div className="text-zinc-500 w-16 text-right">${cost.toFixed(4)}</div>
              </div>
            ))}
            {Object.keys(byTier).length === 0 && <div className="text-[12px] text-zinc-600">Sem dados</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
