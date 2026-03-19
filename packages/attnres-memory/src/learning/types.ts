// ============================================================
// Learning Layer — Types
// ============================================================

export type LearningCategory =
  | 'error_pattern'
  | 'success_pattern'
  | 'tool_usage'
  | 'architecture'
  | 'agent_limitation'
  | 'cost_optimization'

export interface Learning {
  id:          string
  category:    LearningCategory
  agent:       string
  title:       string
  description: string
  context:     string
  evidence:    string
  importance:  number
  occurrences: number
  created_at:  string
  last_seen:   string
}

export interface LearningAnalysis {
  has_learning:  boolean
  learnings:     Learning[]
  summary:       string
}

export interface ErrorPattern {
  pattern_key:    string
  agent:          string
  error_type:     string
  occurrences:    number
  first_seen:     string
  last_seen:      string
  proposed_fix:   string
  severity:       'low' | 'medium' | 'high' | 'critical'
}
