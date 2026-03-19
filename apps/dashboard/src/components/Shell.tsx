import { Link, useLocation } from 'react-router-dom'
import { useApiHealth, useFinopsAlerts, useTasks } from '../lib/hooks'

interface NavItem { to: string; label: string; dot: string; badge?: number }

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const loc = useLocation()
  return (
    <div className="mb-1">
      <div className="px-4 pt-2 pb-1 text-[10px] font-medium tracking-wider uppercase text-zinc-500">{label}</div>
      {items.map(item => {
        const active = loc.pathname === item.to || (item.to !== '/' && loc.pathname.startsWith(item.to))
        return (
          <Link key={item.to} to={item.to}
            className={`flex items-center gap-2 px-4 py-[7px] text-[13px] border-l-2 transition-colors ${
              active ? 'border-purple-500 bg-zinc-900 text-zinc-100 font-medium' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.dot }} />
            <span className="flex-1">{item.label}</span>
            {!!item.badge && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-400">{item.badge}</span>}
          </Link>
        )
      })}
    </div>
  )
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Visao geral', '/tasks': 'Tasks', '/agents': 'Agentes', '/approvals': 'Aprovacoes',
  '/memory': 'AttnRes Memory', '/learnings': 'Aprendizados', '/products': 'Apps',
  '/templates': 'Templates', '/costs': 'Custos', '/finops': 'FinOps Alerts',
  '/settings': 'Configuracoes', '/secrets': 'Secrets', '/audit': 'Audit log',
}

export function Shell({ children }: { children: React.ReactNode }) {
  const apiStatus = useApiHealth()
  const { tasks } = useTasks(50)
  const { activeCount } = useFinopsAlerts()
  const loc = useLocation()

  const running = tasks.filter(t => t.status === 'running').length
  const review  = tasks.filter(t => (t.metadata as Record<string,unknown>)?.requires_review).length

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <aside className="w-48 flex-shrink-0 border-r border-zinc-800 flex flex-col overflow-y-auto bg-zinc-900/50">
        <div className="px-4 py-4 border-b border-zinc-800">
          <div className="text-sm font-medium">Factorify</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Autonomous Factory</div>
        </div>
        <nav className="flex-1 py-2">
          <NavGroup label="Plataforma" items={[
            { to: '/', label: 'Visao geral', dot: '#7F77DD' },
            { to: '/tasks', label: 'Tasks', dot: '#1D9E75', badge: running || undefined },
            { to: '/agents', label: 'Agentes', dot: '#378ADD' },
            { to: '/approvals', label: 'Aprovacoes', dot: '#BA7517', badge: review || undefined },
          ]} />
          <NavGroup label="Inteligencia" items={[
            { to: '/memory', label: 'AttnRes', dot: '#534AB7' },
            { to: '/learnings', label: 'Aprendizados', dot: '#AFA9EC' },
          ]} />
          <NavGroup label="Produtos" items={[
            { to: '/products', label: 'Apps', dot: '#D4537E' },
            { to: '/templates', label: 'Templates', dot: '#D85A30' },
          ]} />
          <NavGroup label="Financas" items={[
            { to: '/costs', label: 'Custos', dot: '#EF9F27' },
            { to: '/finops', label: 'Alertas', dot: '#E24B4A', badge: activeCount || undefined },
          ]} />
          <NavGroup label="Sistema" items={[
            { to: '/settings', label: 'Configuracoes', dot: '#888780' },
            { to: '/secrets', label: 'Secrets', dot: '#444441' },
            { to: '/audit', label: 'Audit log', dot: '#B4B2A9' },
          ]} />
        </nav>
        <div className="px-4 py-3 border-t border-zinc-800 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${apiStatus === 'ok' ? 'bg-green-500' : apiStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`} />
            API {apiStatus === 'ok' ? 'online' : apiStatus === 'error' ? 'offline' : '...'}
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 border-b border-zinc-800 flex items-center px-5 gap-3 flex-shrink-0 bg-zinc-900/30">
          <h1 className="text-sm font-medium flex-1">{PAGE_TITLES[loc.pathname] ?? 'Factorify'}</h1>
          <Link to="/tasks" className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium transition-colors">+ Nova task</Link>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
