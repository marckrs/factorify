import { useState } from 'react'

const SECRETS = [
  { key: 'ANTHROPIC_API_KEY', masked: 'sk-ant-***...***' },
  { key: 'SUPABASE_URL', masked: 'https://lqqj***...co' },
  { key: 'SUPABASE_SERVICE_KEY', masked: 'eyJhb***...***' },
  { key: 'FACTORY_API_KEY', masked: '7fd3a***...***' },
  { key: 'GITHUB_TOKEN', masked: 'PENDENTE' },
  { key: 'VERCEL_TOKEN', masked: 'PENDENTE' },
]

export function Secrets() {
  const [revealed, setRevealed] = useState<string | null>(null)
  return (
    <div className="p-5">
      <div className="px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 mb-4 text-[12px] text-zinc-500">
        Secrets mascarados. Valores reais no .env local e GitHub Secrets.
      </div>
      <div className="space-y-1.5">
        {SECRETS.map(s => (
          <div key={s.key} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
            <div className="text-[12px] font-medium font-mono text-zinc-300 w-52">{s.key}</div>
            <div className="flex-1 text-[12px] text-zinc-500 font-mono">{revealed === s.key ? '(valor no .env)' : s.masked}</div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.masked === 'PENDENTE' ? 'bg-amber-900/30 text-amber-400' : 'bg-green-900/30 text-green-400'}`}>
              {s.masked === 'PENDENTE' ? 'Pendente' : 'Ativa'}
            </span>
            <button onClick={() => setRevealed(revealed === s.key ? null : s.key)}
              className="text-[11px] px-2 py-1 rounded border border-zinc-700 text-zinc-500 hover:text-zinc-300">
              {revealed === s.key ? 'Ocultar' : 'Reveal'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
