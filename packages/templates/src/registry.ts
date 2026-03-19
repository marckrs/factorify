// ============================================================
// Template Registry — catalogo central de templates reutilizaveis
// ============================================================
// INSTRUCAO PARA O CODE AGENT:
//
// Antes de implementar QUALQUER tela ou feature de UI:
//   1. Consulte este registry via findTemplates() ou getTemplate()
//   2. Se existir template compativel -> use como base, adapte as props
//   3. Se nao existir -> implemente do zero, depois registre aqui
//   4. Ao reutilizar -> chame incrementReuse(id) para rastrear ROI
// ============================================================

import type { TemplateEntry, TemplateCategory } from './types.js'

const REGISTRY: TemplateEntry[] = [
  {
    id:          'auth-social-login',
    name:        'Social Login Screen',
    category:    'auth',
    description: 'Tela de login e cadastro com social login (Google, GitHub) e email/senha. Inclui validacao de formulario, loading states, error handling, redirect pos-login, e dark mode nativo. Integrado com Supabase Auth.',
    component:   './auth/AuthScreen',
    integrations: [
      { name: 'supabase-auth', required: true,  docs: 'https://supabase.com/docs/guides/auth' },
      { name: 'google-oauth',  required: false, docs: 'https://supabase.com/docs/guides/auth/social-login/auth-google' },
      { name: 'github-oauth',  required: false, docs: 'https://supabase.com/docs/guides/auth/social-login/auth-github' },
    ],
    props: [
      { name: 'productName',  type: 'string',                          required: true,  description: 'Nome do produto exibido no header' },
      { name: 'logoUrl',      type: 'string',                          required: false, description: 'URL do logo. Se omitido, exibe so o nome.' },
      { name: 'primaryColor', type: 'string',                          required: false, default: '#7F77DD', description: 'Cor primaria do CTA (hex)' },
      { name: 'redirectUrl',  type: 'string',                          required: false, default: '/dashboard', description: 'URL pos-login' },
      { name: 'providers',    type: "Array<'google'|'github'|'email'>", required: false, default: "['google','email']", description: 'Providers de login' },
    ],
    status:      'scaffold',
    tags:        ['auth', 'login', 'oauth', 'social', 'supabase'],
    reuse_count: 0,
    created_at:  '2026-03-19',
    updated_at:  '2026-03-19',
    notes:       'Implementacao completa disponivel apos primeiro produto real. NUNCA armazene tokens no localStorage — use Supabase session cookies.',
  },
  {
    id:          'dashboard-shell',
    name:        'Dashboard Shell',
    category:    'dashboard',
    description: 'Layout base de dashboard SaaS: sidebar colapsavel, topbar com user menu, area de conteudo com breadcrumb, e mobile-responsive. Suporte a nested routes.',
    component:   './dashboard/DashboardShell',
    integrations: [
      { name: 'supabase-auth', required: true, docs: 'https://supabase.com/docs/guides/auth' },
    ],
    props: [
      { name: 'navItems',    type: 'NavItem[]', required: true, description: 'Itens da sidebar: { label, icon, href, badge? }' },
      { name: 'user',        type: '{ name: string; email: string; avatarUrl?: string }', required: true, description: 'Dados do usuario logado' },
      { name: 'productName', type: 'string',    required: true, description: 'Nome do produto para o logo' },
    ],
    status:      'scaffold',
    tags:        ['dashboard', 'layout', 'sidebar', 'navigation', 'shell'],
    reuse_count: 0,
    created_at:  '2026-03-19',
    updated_at:  '2026-03-19',
  },
  {
    id:          'billing-pricing-page',
    name:        'Pricing Page',
    category:    'billing',
    description: 'Pagina de pricing com 3 planos. Toggle mensal/anual com desconto. Checkout integrado com Stripe. Feature comparison table, FAQ, social proof.',
    component:   './billing/PricingPage',
    integrations: [
      { name: 'stripe',        required: true, docs: 'https://stripe.com/docs/billing/subscriptions/overview' },
      { name: 'supabase-auth', required: true, docs: 'https://supabase.com/docs/guides/auth' },
    ],
    props: [
      { name: 'plans',         type: 'PricingPlan[]', required: true,  description: 'Array de planos: { name, price, interval, features, stripePriceId }' },
      { name: 'highlightPlan', type: 'string',        required: false, default: 'pro', description: 'ID do plano a destacar' },
    ],
    status:      'scaffold',
    tags:        ['billing', 'pricing', 'stripe', 'subscription', 'saas'],
    reuse_count: 0,
    created_at:  '2026-03-19',
    updated_at:  '2026-03-19',
  },
  {
    id:          'onboarding-flow',
    name:        'Onboarding Flow',
    category:    'onboarding',
    description: 'Fluxo de onboarding em steps: welcome -> profile setup -> product tour -> first action. Progress bar, persistencia no Supabase, skip por step.',
    component:   './onboarding/OnboardingFlow',
    integrations: [
      { name: 'supabase', required: true, docs: 'https://supabase.com/docs' },
    ],
    props: [
      { name: 'steps',      type: 'OnboardingStep[]', required: true, description: 'Array de steps: { id, title, description, component, skippable }' },
      { name: 'onComplete', type: '() => void',       required: true, description: 'Callback quando todos steps completam' },
    ],
    status:      'scaffold',
    tags:        ['onboarding', 'wizard', 'steps', 'activation', 'saas'],
    reuse_count: 0,
    created_at:  '2026-03-19',
    updated_at:  '2026-03-19',
  },
  {
    id:          'settings-account-page',
    name:        'Account Settings Page',
    category:    'settings',
    description: 'Pagina de configuracoes: profile edit, password change, danger zone (delete account), notification preferences. Integrado com Supabase Auth.',
    component:   './settings/AccountSettingsPage',
    integrations: [
      { name: 'supabase-auth', required: true, docs: 'https://supabase.com/docs/guides/auth' },
    ],
    props: [
      { name: 'user',            type: 'User',              required: true, description: 'Objeto do usuario atual' },
      { name: 'onDeleteAccount', type: '() => Promise<void>', required: true, description: 'Handler para delecao de conta' },
    ],
    status:      'scaffold',
    tags:        ['settings', 'account', 'profile', 'auth'],
    reuse_count: 0,
    created_at:  '2026-03-19',
    updated_at:  '2026-03-19',
  },
]

// ── Public API ────────────────────────────────────────────────

export function findTemplates(query: {
  category?:  TemplateCategory
  tags?:      string[]
  status?:    TemplateEntry['status']
  search?:    string
}): TemplateEntry[] {
  return REGISTRY.filter(t => {
    if (query.category && t.category !== query.category) return false
    if (query.status   && t.status   !== query.status)   return false
    if (query.tags?.length) {
      if (!query.tags.some(tag => t.tags.includes(tag))) return false
    }
    if (query.search) {
      const q = query.search.toLowerCase()
      const hit =
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
      if (!hit) return false
    }
    return true
  })
}

export function getTemplate(id: string): TemplateEntry | undefined {
  return REGISTRY.find(t => t.id === id)
}

export function incrementReuse(id: string, productName: string): void {
  const t = REGISTRY.find(t => t.id === id)
  if (!t) return
  t.reuse_count++
  t.updated_at = new Date().toISOString().slice(0, 10)
  if (!t.first_used_in) t.first_used_in = productName
}

export function promoteTemplate(id: string, status: TemplateEntry['status'], notes?: string): void {
  const t = REGISTRY.find(t => t.id === id)
  if (!t) return
  t.status     = status
  t.updated_at = new Date().toISOString().slice(0, 10)
  if (notes) t.notes = notes
}

export function registrySummary(): string {
  const byStatus = REGISTRY.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topReused = [...REGISTRY]
    .sort((a, b) => b.reuse_count - a.reuse_count)
    .slice(0, 3)
    .map(t => `${t.id} (${t.reuse_count}x)`)

  return [
    `Template Registry: ${REGISTRY.length} templates`,
    `Status: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}`,
    `Categories: ${[...new Set(REGISTRY.map(t => t.category))].join(', ')}`,
    `Most reused: ${topReused.join(', ') || 'none yet'}`,
    ``,
    `Available IDs: ${REGISTRY.map(t => t.id).join(', ')}`,
  ].join('\n')
}

export { REGISTRY }
