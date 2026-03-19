/**
 * @factory/orchestrator - Core type definitions
 *
 * Defines the foundational types for task decomposition,
 * agent routing, execution planning, and result synthesis.
 */

export type TaskType = "dev" | "ops" | "biz" | "meta";

export type TaskPriority = "critical" | "high" | "normal" | "low";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "blocked";

export type AutonomyLevel = "full" | "supervised" | "manual";

export interface Task {
  readonly id: string;
  readonly description: string;
  readonly type: TaskType;
  readonly priority: TaskPriority;
  status: TaskStatus;
  readonly dependencies: readonly string[];
  assigned_agent?: string;
  result?: TaskResult;
  readonly created_at: Date;
  completed_at?: Date;
}

export interface SubTask extends Task {
  readonly parent_id: string;
}

export interface AgentSpec {
  readonly name: string;
  readonly type: TaskType;
  readonly capabilities: readonly string[];
  readonly autonomy_level: AutonomyLevel;
}

export interface ExecutionPlan {
  readonly id: string;
  readonly original_task: Task;
  readonly subtasks: readonly SubTask[];
  readonly dependency_graph: Map<string, string[]>;
  readonly estimated_duration_ms?: number;
  readonly created_at: Date;
}

export interface TaskResult {
  readonly task_id: string;
  readonly status: TaskStatus;
  readonly output?: string;
  readonly error?: string;
  readonly duration_ms: number;
}

export interface ExecutionResult {
  readonly plan_id: string;
  readonly results: Map<string, TaskResult>;
  readonly summary: string;
  readonly total_duration_ms: number;
  readonly success: boolean;
}
