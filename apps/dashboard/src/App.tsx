import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Shell }      from './components/Shell'
import { Overview }   from './pages/Overview'
import { Tasks }      from './pages/Tasks'
import { Agents }     from './pages/Agents'
import { Costs }      from './pages/Costs'
import { Memory }     from './pages/Memory'
import { Learnings }  from './pages/Learnings'
import { Settings }   from './pages/Settings'
import { Secrets }    from './pages/Secrets'

const Placeholder = ({ title }: { title: string }) => (
  <div className="p-5 text-[13px] text-zinc-600">{title} - proxima iteracao</div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/"          element={<Overview />} />
          <Route path="/tasks"     element={<Tasks />} />
          <Route path="/agents"    element={<Agents />} />
          <Route path="/approvals" element={<Placeholder title="Aprovacoes de deploy e revisoes humanas" />} />
          <Route path="/memory"    element={<Memory />} />
          <Route path="/learnings" element={<Learnings />} />
          <Route path="/products"  element={<Placeholder title="Apps gerados pela plataforma" />} />
          <Route path="/templates" element={<Placeholder title="Template Registry (ADR-012)" />} />
          <Route path="/costs"     element={<Costs />} />
          <Route path="/finops"    element={<Placeholder title="FinOps Alerts" />} />
          <Route path="/settings"  element={<Settings />} />
          <Route path="/secrets"   element={<Secrets />} />
          <Route path="/audit"     element={<Placeholder title="Audit log imutavel (ADR-008)" />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}
