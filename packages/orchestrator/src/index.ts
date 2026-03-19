/**
 * @factory/orchestrator
 *
 * Meta-orchestrator that decomposes complex tasks into subtasks,
 * routes to specialized agents, and synthesizes results.
 */

// Core
export type {
  Task,
  SubTask,
  AgentSpec,
  ExecutionPlan,
  ExecutionResult,
  TaskResult,
  TaskType,
  TaskPriority,
  TaskStatus,
  AutonomyLevel,
} from "./core/types.js";

export { TaskDecomposer } from "./core/decomposer.js";
export { DependencyGraph } from "./core/dependency-graph.js";
export { Orchestrator } from "./core/orchestrator.js";
export type { OrchestratorOptions } from "./core/orchestrator.js";

// Execution
export { AgentRunner } from "./execution/agent-runner.js";
export { ParallelExecutor } from "./execution/parallel-executor.js";
export { ResultMerger } from "./execution/result-merger.js";

// Cost-Aware Routing
export { routeToModel, estimateMonthlySavings } from "./core/model-router.js";
export type { ModelTier, RoutingDecision } from "./core/model-router.js";
