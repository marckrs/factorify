/**
 * @factory/orchestrator - Result Merger
 *
 * Synthesizes individual task results into a cohesive summary,
 * reporting successes, failures, and aggregate statistics.
 */

import type { TaskResult } from "../core/types.js";

export class ResultMerger {
  /**
   * Merges all task results into a human-readable summary string.
   */
  merge(results: Map<string, TaskResult>): string {
    const entries = [...results.values()];

    if (entries.length === 0) {
      return "No tasks were executed.";
    }

    const completed = entries.filter((r) => r.status === "completed");
    const failed = entries.filter((r) => r.status === "failed");
    const totalDuration = entries.reduce((sum, r) => sum + r.duration_ms, 0);

    const lines: string[] = [
      `Execution Summary`,
      `${"=".repeat(60)}`,
      `Total tasks: ${entries.length}`,
      `Completed:   ${completed.length}`,
      `Failed:      ${failed.length}`,
      `Total duration: ${totalDuration}ms`,
      ``,
    ];

    if (completed.length > 0) {
      lines.push(`Completed Tasks:`);
      lines.push(`${"-".repeat(40)}`);
      for (const result of completed) {
        lines.push(`  [OK] ${result.task_id} (${result.duration_ms}ms)`);
        if (result.output) {
          const firstLine = result.output.split("\n")[0] ?? "";
          lines.push(`       ${firstLine}`);
        }
      }
      lines.push(``);
    }

    if (failed.length > 0) {
      lines.push(`Failed Tasks:`);
      lines.push(`${"-".repeat(40)}`);
      for (const result of failed) {
        lines.push(`  [FAIL] ${result.task_id} (${result.duration_ms}ms)`);
        if (result.error) {
          lines.push(`         Error: ${result.error}`);
        }
      }
      lines.push(``);
    }

    const successRate =
      entries.length > 0
        ? ((completed.length / entries.length) * 100).toFixed(1)
        : "0.0";

    lines.push(`Success rate: ${successRate}%`);

    return lines.join("\n");
  }
}
