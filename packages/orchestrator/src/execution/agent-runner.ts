/**
 * @factory/orchestrator - Agent Runner
 *
 * Runs a subtask against a specific agent. Currently provides a simulation
 * layer; designed to be replaced with real agent integration (e.g., LLM
 * tool-use, subprocess dispatch, or RPC calls).
 */

import type { SubTask, AgentSpec, TaskResult } from "../core/types.js";

export class AgentRunner {
  private readonly simulatedLatencyMs: number;

  constructor(options?: { simulatedLatencyMs?: number }) {
    this.simulatedLatencyMs = options?.simulatedLatencyMs ?? 50;
  }

  /**
   * Executes a subtask using the given agent specification.
   * Returns a TaskResult once the agent has completed (or failed).
   */
  async run(subtask: SubTask, agent: AgentSpec): Promise<TaskResult> {
    const startTime = performance.now();

    try {
      this.validateAssignment(subtask, agent);

      // Simulate agent processing time proportional to priority.
      const latency = this.computeLatency(subtask);
      await this.sleep(latency);

      const output = this.simulateExecution(subtask, agent);
      const duration_ms = Math.round(performance.now() - startTime);

      return {
        task_id: subtask.id,
        status: "completed",
        output,
        duration_ms,
      };
    } catch (error) {
      const duration_ms = Math.round(performance.now() - startTime);
      const message =
        error instanceof Error ? error.message : String(error);

      return {
        task_id: subtask.id,
        status: "failed",
        error: message,
        duration_ms,
      };
    }
  }

  /**
   * Validates that the agent is capable of handling the subtask type.
   */
  private validateAssignment(subtask: SubTask, agent: AgentSpec): void {
    if (agent.type !== subtask.type) {
      throw new Error(
        `Agent "${agent.name}" (type=${agent.type}) cannot handle subtask type="${subtask.type}"`,
      );
    }
  }

  /**
   * Computes simulated latency based on task priority.
   */
  private computeLatency(subtask: SubTask): number {
    const multipliers: Record<string, number> = {
      critical: 0.5,
      high: 0.75,
      normal: 1.0,
      low: 1.5,
    };
    const multiplier = multipliers[subtask.priority] ?? 1.0;
    return Math.round(this.simulatedLatencyMs * multiplier);
  }

  /**
   * Produces a simulated output string for the subtask.
   * In a real system, this would invoke the agent's tool chain.
   */
  private simulateExecution(subtask: SubTask, agent: AgentSpec): string {
    return (
      `[${agent.name}] Completed: ${subtask.description}\n` +
      `  Type: ${subtask.type} | Priority: ${subtask.priority}\n` +
      `  Agent capabilities: ${agent.capabilities.join(", ")}\n` +
      `  Autonomy: ${agent.autonomy_level}`
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
