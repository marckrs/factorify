/**
 * @factory/orchestrator - Main Orchestrator
 *
 * The meta-orchestrator decomposes complex tasks into subtasks,
 * builds a dependency graph, routes subtasks to specialized agents,
 * and synthesizes results into a unified execution report.
 */

import { randomUUID } from "node:crypto";
import type {
  Task,
  SubTask,
  AgentSpec,
  ExecutionPlan,
  ExecutionResult,
  TaskResult,
} from "./types.js";
import { TaskDecomposer } from "./decomposer.js";
import { DependencyGraph } from "./dependency-graph.js";
import { AgentRunner } from "../execution/agent-runner.js";
import { ParallelExecutor } from "../execution/parallel-executor.js";
import { ResultMerger } from "../execution/result-merger.js";

export interface OrchestratorOptions {
  readonly agents?: AgentSpec[];
  readonly simulatedLatencyMs?: number;
  readonly concurrencyLimit?: number;
  readonly runner?: AgentRunner;
}

export class Orchestrator {
  private readonly decomposer: TaskDecomposer;
  private readonly runner: AgentRunner;
  private readonly executor: ParallelExecutor;
  private readonly merger: ResultMerger;

  constructor(options?: OrchestratorOptions) {
    this.decomposer = new TaskDecomposer();
    this.runner = options?.runner ?? new AgentRunner({
      simulatedLatencyMs: options?.simulatedLatencyMs,
    });
    this.executor = new ParallelExecutor({
      agents: options?.agents,
      concurrencyLimit: options?.concurrencyLimit,
    });
    this.merger = new ResultMerger();
  }

  /**
   * Plans the execution of a task by decomposing it into subtasks
   * and building a dependency graph.
   */
  plan(task: Task): ExecutionPlan {
    const subtasks = this.decomposer.decompose(task);
    const graph = this.buildGraph(subtasks);

    // Validate the graph is a DAG.
    if (graph.hasCycle()) {
      throw new Error(
        `Decomposition produced a cyclic dependency graph for task "${task.id}"`,
      );
    }

    const layers = graph.getExecutionOrder();
    const estimatedDuration = this.estimateDuration(layers, subtasks);

    return {
      id: randomUUID(),
      original_task: task,
      subtasks,
      dependency_graph: graph.toMap(),
      estimated_duration_ms: estimatedDuration,
      created_at: new Date(),
    };
  }

  /**
   * Executes a plan by running subtasks in dependency order,
   * parallelizing independent tasks within each layer.
   */
  async execute(plan: ExecutionPlan): Promise<ExecutionResult> {
    const startTime = performance.now();
    const graph = DependencyGraph.fromMap(plan.dependency_graph);
    const layers = graph.getExecutionOrder();
    const results = new Map<string, TaskResult>();

    // Build a lookup from subtask ID to SubTask.
    const subtaskMap = new Map<string, SubTask>();
    for (const subtask of plan.subtasks) {
      subtaskMap.set(subtask.id, subtask);
    }

    for (const layer of layers) {
      const layerTasks = layer
        .map((id) => subtaskMap.get(id))
        .filter((t): t is SubTask => t !== undefined);

      // Check if any dependency failed; mark blocked tasks.
      const { runnable, blocked } = this.partitionByBlockedStatus(
        layerTasks,
        results,
      );

      // Record blocked tasks.
      for (const task of blocked) {
        results.set(task.id, {
          task_id: task.id,
          status: "blocked",
          error: "One or more dependencies failed",
          duration_ms: 0,
        });
      }

      // Execute runnable tasks in parallel.
      if (runnable.length > 0) {
        const layerResults = await this.executor.executeLayer(
          runnable,
          this.runner,
        );

        for (const result of layerResults) {
          results.set(result.task_id, result);
        }
      }
    }

    const totalDuration = Math.round(performance.now() - startTime);
    const summary = this.merger.merge(results);
    const allSucceeded = [...results.values()].every(
      (r) => r.status === "completed",
    );

    return {
      plan_id: plan.id,
      results,
      summary,
      total_duration_ms: totalDuration,
      success: allSucceeded,
    };
  }

  /**
   * Builds a DependencyGraph from the subtask dependency declarations.
   */
  private buildGraph(subtasks: SubTask[]): DependencyGraph {
    const graph = new DependencyGraph();

    for (const subtask of subtasks) {
      graph.addNode(subtask.id);
    }

    for (const subtask of subtasks) {
      for (const dep of subtask.dependencies) {
        graph.addEdge(dep, subtask.id);
      }
    }

    return graph;
  }

  /**
   * Partitions tasks into runnable and blocked based on dependency results.
   */
  private partitionByBlockedStatus(
    tasks: SubTask[],
    results: Map<string, TaskResult>,
  ): { runnable: SubTask[]; blocked: SubTask[] } {
    const runnable: SubTask[] = [];
    const blocked: SubTask[] = [];

    for (const task of tasks) {
      const hasFailedDep = task.dependencies.some((depId) => {
        const depResult = results.get(depId);
        return depResult && depResult.status !== "completed";
      });

      if (hasFailedDep) {
        blocked.push(task);
      } else {
        runnable.push(task);
      }
    }

    return { runnable, blocked };
  }

  /**
   * Estimates total execution duration based on layer structure.
   * Assumes tasks in a layer run in parallel, so each layer's time
   * is the max of its tasks. Total is the sum of layer maxes.
   */
  private estimateDuration(layers: string[][], subtasks: SubTask[]): number {
    const priorityWeight: Record<string, number> = {
      critical: 50,
      high: 75,
      normal: 100,
      low: 150,
    };

    const subtaskMap = new Map<string, SubTask>();
    for (const st of subtasks) {
      subtaskMap.set(st.id, st);
    }

    let total = 0;

    for (const layer of layers) {
      let maxInLayer = 0;

      for (const id of layer) {
        const st = subtaskMap.get(id);
        const weight = st ? (priorityWeight[st.priority] ?? 100) : 100;
        maxInLayer = Math.max(maxInLayer, weight);
      }

      total += maxInLayer;
    }

    return total;
  }
}
