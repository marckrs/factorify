// @factory/templates — Public API

export {
  findTemplates,
  getTemplate,
  incrementReuse,
  promoteTemplate,
  registrySummary,
  REGISTRY,
} from './registry.js'

export type {
  TemplateEntry,
  TemplateCategory,
  TemplateStatus,
  TemplateIntegration,
  TemplateProp,
} from './types.js'
