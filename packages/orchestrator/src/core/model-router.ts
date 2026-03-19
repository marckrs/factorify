// ============================================================
// Model Router — Cost-Aware Routing (framework technique #36)
// ============================================================
// Routes tasks to the cheapest model that can handle them.
// Estimated additional savings: 50-60% on top of prompt caching.
// ============================================================

export type ModelTier = 'haiku' | 'sonnet'

export interface RoutingDecision {
  model:           string
  tier:            ModelTier
  reasoning:       string
  cost_multiplier: number
}

const HAIKU_SIGNALS = [
  'status', 'check', 'verify', 'ping', 'health',
  'format', 'lint', 'rename', 'move', 'copy',
  'log', 'report', 'summary', 'count', 'list',
  'document', 'comment', 'readme', 'changelog',
  'translate', 'i18n', 'localize',
]

const SONNET_SIGNALS = [
  'architect', 'design', 'implement', 'build', 'create',
  'refactor', 'optimize', 'debug', 'fix', 'solve',
  'analyze', 'review', 'audit', 'validate',
  'orchestrate', 'decompose', 'plan',
  'auth', 'security', 'payment', 'billing',
  'database', 'schema', 'migration', 'api',
  'algorithm', 'performance', 'scale',
]

const AGENT_DEFAULTS: Record<string, ModelTier> = {
  'orchestrator':   'sonnet',
  'code-smith':     'sonnet',
  'review-guard':   'sonnet',
  'incident':       'sonnet',
  'gtm':            'sonnet',
  'infra-pilot':    'haiku',
  'monitor':        'haiku',
  'biz-analyst':    'haiku',
  'support':        'haiku',
  'test-engineer':  'haiku',
}

const MODELS: Record<ModelTier, string> = {
  haiku:  'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-20250514',
}

const COST_MULTIPLIER: Record<ModelTier, number> = {
  haiku:  0.33,
  sonnet: 1.00,
}

export function routeToModel(params: {
  agent:     string
  task:      string
  priority?: string
}): RoutingDecision {
  const { agent, task, priority } = params

  if (priority === 'critical') {
    return decide('sonnet', 'Critical priority — always use full model')
  }

  const agentDefault = AGENT_DEFAULTS[agent]
  if (agentDefault) {
    const taskLower = task.toLowerCase()
    const hasSonnet = SONNET_SIGNALS.some(s => taskLower.includes(s))
    const hasHaiku  = HAIKU_SIGNALS.some(s => taskLower.includes(s))

    if (agentDefault === 'haiku' && hasSonnet) {
      return decide('sonnet', `Agent default=haiku but task has complexity signal`)
    }
    if (agentDefault === 'sonnet' && hasHaiku && !hasSonnet) {
      return decide('haiku', `Agent default=sonnet but task is simple`)
    }
    return decide(agentDefault, `Agent ${agent} default`)
  }

  const taskLower = task.toLowerCase()
  if (SONNET_SIGNALS.some(s => taskLower.includes(s))) return decide('sonnet', 'Task has complexity signals')
  if (HAIKU_SIGNALS.some(s => taskLower.includes(s)))   return decide('haiku',  'Task has simplicity signals')
  if (task.length > 500) return decide('sonnet', 'Long description — likely complex')
  if (task.length < 100) return decide('haiku',  'Short description — likely simple')

  return decide('sonnet', 'Uncertain — defaulting to full capability')
}

function decide(tier: ModelTier, reasoning: string): RoutingDecision {
  return { model: MODELS[tier], tier, reasoning, cost_multiplier: COST_MULTIPLIER[tier] }
}

export function estimateMonthlySavings(params: {
  avg_tasks_per_day:   number
  avg_tokens_per_task: number
  haiku_pct:           number
}): {
  without_routing_usd: number
  with_routing_usd:    number
  savings_usd:         number
  savings_pct:         number
} {
  const { avg_tasks_per_day, avg_tokens_per_task, haiku_pct } = params
  const monthly = avg_tasks_per_day * 30
  const sonnet  = 3 / 1_000_000
  const haiku   = 1 / 1_000_000

  const without = monthly * avg_tokens_per_task * sonnet
  const with_r  = monthly * avg_tokens_per_task * (haiku_pct * haiku + (1 - haiku_pct) * sonnet)

  return {
    without_routing_usd: Math.round(without * 100) / 100,
    with_routing_usd:    Math.round(with_r * 100) / 100,
    savings_usd:         Math.round((without - with_r) * 100) / 100,
    savings_pct:         Math.round((1 - with_r / without) * 100),
  }
}
