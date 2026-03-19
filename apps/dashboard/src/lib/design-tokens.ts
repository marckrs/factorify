export const STATUS_COLORS = {
  completed: { bg: 'bg-green-900/20', text: 'text-green-400', dot: '#1D9E75' },
  running:   { bg: 'bg-yellow-900/20', text: 'text-yellow-400', dot: '#BA7517' },
  queued:    { bg: 'bg-blue-900/20', text: 'text-blue-400', dot: '#378ADD' },
  failed:    { bg: 'bg-red-900/20', text: 'text-red-400', dot: '#E24B4A' },
} as const

export const AGENT_COLORS: Record<string, string> = {
  'code-smith':     '#7F77DD',
  'test-engineer':  '#1D9E75',
  'review-guard':   '#378ADD',
  'infra-pilot':    '#D85A30',
  'monitor':        '#EF9F27',
  'incident':       '#E24B4A',
  'biz-analyst':    '#D4537E',
  'gtm':            '#5DCAA5',
  'support':        '#B4B2A9',
  'orchestrator':   '#534AB7',
}

export const MODEL_TIER_COLORS: Record<string, string> = {
  sonnet: '#7F77DD',
  haiku:  '#1D9E75',
}
