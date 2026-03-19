// ============================================================
// @factory/templates — Types
// ============================================================

export type TemplateStatus =
  | 'scaffold'
  | 'in-progress'
  | 'production-ready'
  | 'deprecated'

export type TemplateCategory =
  | 'auth'
  | 'dashboard'
  | 'onboarding'
  | 'billing'
  | 'settings'
  | 'marketing'
  | 'common'

export interface TemplateIntegration {
  name:     string
  required: boolean
  docs:     string
}

export interface TemplateProp {
  name:        string
  type:        string
  required:    boolean
  default?:    string
  description: string
}

export interface TemplateEntry {
  id:            string
  name:          string
  category:      TemplateCategory
  description:   string
  component:     string
  props:         TemplateProp[]
  integrations:  TemplateIntegration[]
  status:        TemplateStatus
  tags:          string[]
  first_used_in?: string
  reuse_count:   number
  created_at:    string
  updated_at:    string
  notes?:        string
}
