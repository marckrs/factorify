import { useLearnings } from '../lib/hooks'

export function Learnings() {
  const learnings = useLearnings()
  const foundational = learnings.filter(l => l.importance >= 0.90).length

  return (
    <div className="p-5">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Total</div>
          <div className="text-2xl font-medium">{learnings.length}</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Foundational</div>
          <div className="text-2xl font-medium text-purple-400">{foundational}</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Agentes</div>
          <div className="text-2xl font-medium">{new Set(learnings.map(l => l.agent_type)).size}</div>
        </div>
      </div>

      {learnings.length === 0
        ? <div className="text-[13px] text-zinc-600 py-8 text-center">Nenhum aprendizado ainda</div>
        : <div className="space-y-2">
            {learnings.map(l => (
              <div key={l.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    l.importance >= 0.90 ? 'bg-purple-900/40 text-purple-400' : l.importance >= 0.80 ? 'bg-teal-900/40 text-teal-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>{l.importance >= 0.90 ? 'foundational' : 'relevant'}</span>
                  <span className="text-[10px] text-zinc-500">{l.agent_type}</span>
                  <span className="text-[10px] text-zinc-600">{l.category}</span>
                  <span className="text-[10px] text-zinc-600 ml-auto">{l.occurrences}x</span>
                </div>
                <div className="text-[13px] font-medium text-zinc-200 mb-1">{l.title}</div>
                <div className="text-[12px] text-zinc-500">{l.description}</div>
              </div>
            ))}
          </div>}
    </div>
  )
}
