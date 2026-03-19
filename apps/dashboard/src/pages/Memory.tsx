import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Entry { id: string; block_type: string; importance: number; content: string; created_at: string; metadata: Record<string, unknown> }

export function Memory() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase.from('attnres_memories').select('*').order('importance', { ascending: false }).limit(100)
      .then(({ data }) => { if (data) setEntries(data as Entry[]) })
  }, [])

  const filtered = filter === 'all' ? entries : entries.filter(e => e.block_type === filter)
  const foundational = entries.filter(e => e.block_type === 'foundational').length
  const relevant = entries.filter(e => e.block_type === 'relevant').length

  return (
    <div className="p-5">
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Total</div>
          <div className="text-2xl font-medium">{entries.length}</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Foundational</div>
          <div className="text-2xl font-medium text-purple-400">{foundational}</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Relevant</div>
          <div className="text-2xl font-medium text-teal-400">{relevant}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'foundational', 'relevant', 'recent'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[12px] rounded-md border transition-colors ${
              filter === f ? 'border-purple-600 text-purple-400 bg-purple-900/20' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
            }`}>{f}</button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.slice(0, 30).map(e => (
          <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                e.block_type === 'foundational' ? 'bg-purple-900/40 text-purple-400' : 'bg-teal-900/40 text-teal-400'
              }`}>{e.block_type}</span>
              <span className="text-[10px] text-zinc-600 ml-auto">imp: {e.importance.toFixed(2)}</span>
            </div>
            <div className="text-[12px] text-zinc-400 line-clamp-2">{e.content.slice(0, 200)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
