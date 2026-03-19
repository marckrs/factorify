export function Settings() {
  const items = [
    ['Modelo padrao', 'claude-sonnet-4-6'], ['Confidence threshold', '0.70'],
    ['Deploy janela', 'Sex 14h-17h (ADR-003)'], ['Budget mensal', '$50 USD'],
    ['Alerta diario', '$5 USD'], ['Alerta por task', '$0.50 USD'],
  ]
  return (
    <div className="p-5 max-w-2xl">
      <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Plataforma</div>
      <div className="space-y-2">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
            <div className="flex-1 text-[13px]">{label}</div>
            <div className="text-[13px] text-zinc-400 font-mono">{value}</div>
          </div>
        ))}
      </div>
      <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-6 mb-3">COMPANY.md</div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="text-[13px] font-medium mb-1">v2.4.0 - 14 ADRs ativos</div>
        <div className="text-[12px] text-zinc-500">Sincronizado com AttnRes Memory</div>
      </div>
    </div>
  )
}
