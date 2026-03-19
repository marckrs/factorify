/**
 * @factory/orchestrator - Parallel Executor
 *
 * Executes a layer of independent subtasks concurrently,
 * collecting results and handling per-task failures gracefully.
 */

import type { SubTask, AgentSpec, TaskResult } from "../core/types.js";
import type { AgentRunner } from "./agent-runner.js";

export class ParallelExecutor {
  private readonly agentRegistry: Map<string, AgentSpec>;
  private readonly concurrencyLimit: number;

  constructor(options?: {
    agents?: AgentSpec[];
    concurrencyLimit?: number;
  }) {
    this.agentRegistry = new Map();
    this.concurrencyLimit = options?.concurrencyLimit ?? Infinity;

    if (options?.agents) {
      for (const agent of options.agents) {
        this.agentRegistry.set(agent.type, agent);
      }
    }
  }

  /**
   * Registers an agent for a given task type.
   */
  registerAgent(agent: AgentSpec): void {
    this.agentRegistry.set(agent.type, agent);
  }

  /**
   * Executes all subtasks in a layer concurrently, respecting the
   * concurrency limit. Each task is routed to an agent matching its type.
   */
  async executeLayer(
    tasks: SubTask[],
    runner: AgentRunner,
  ): Promise<TaskResult[]> {
    if (tasks.length === 0) {
      return [];
    }

    if (
      this.concurrencyLimit === Infinity ||
      tasks.length <= this.concurrencyLimit
    ) {
      return this.runBatch(tasks, runner);
    }

    // Process in batches to respect concurrency limit.
    const results: TaskResult[] = [];
    for (let i = 0; i < tasks.length; i += this.concurrencyLimit) {
      const batch = tasks.slice(i, i + this.concurrencyLimit);
      const batchResults = await this.runBatch(batch, runner);
      results.push(...batchResults);
    }
    return results;
  }

  private async runBatch(
    tasks: SubTask[],
    runner: AgentRunner,
  ): Promise<TaskResult[]> {
    const promises = tasks.map((task) => {
      const agent = this.resolveAgent(task);
      return runner.run(task, agent);
    });

    return Promise.all(promises);
  }

  /**
   * Resolves the best agent for a given subtask.
   * Falls back to a generic agent if no type-specific agent is registered.
   */
  private resolveAgent(task: SubTask): AgentSpec {
    const agent = this.agentRegistry.get(task.type);

    if (agent) {
      return agent;
    }

    // Fallback: create a generic agent for the task type.
    return {
      name: `generic-${task.type}-agent`,
      type: task.type,
      capabilities: ["general"],
      autonomy_level: "supervised",
    };
  }
}
