// @factory/attnres-memory — package entry point
export * from './core/types.js';
export * from './core/engine.js';
export * from './core/bias-registry.js';
export * from './adapters/inmemory-adapter.js';
export * from './adapters/supabase-adapter.js';
export * from './agents/attnres-agent.js';

// Learning Layer
export { LearningLayer } from './learning/learning-layer.js';
export type { SubtaskInfo, SubtaskResult } from './learning/learning-layer.js';
export { ErrorPatternDetector } from './learning/error-pattern-detector.js';
export type {
  Learning, LearningAnalysis,
  LearningCategory, ErrorPattern,
} from './learning/types.js';
