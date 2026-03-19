/**
 * @factory/orchestrator - Task Decomposer
 *
 * Breaks complex tasks into smaller subtasks based on type,
 * description heuristics, and complexity analysis.
 */

import { randomUUID } from "node:crypto";
import type { Task, SubTask, TaskType, TaskPriority } from "./types.js";

interface DecompositionRule {
  readonly pattern: RegExp;
  readonly subtask_types: readonly TaskType[];
  readonly descriptions: readonly string[];
  readonly dependencies_between?: ReadonlyArray<[number, number]>;
}

const DECOMPOSITION_RULES: readonly DecompositionRule[] = [
  {
    pattern: /deploy|release|ship/i,
    subtask_types: ["dev", "ops", "biz"],
    descriptions: [
      "Build and validate artifacts",
      "Deploy to target environment",
      "Notify stakeholders of release",
    ],
    dependencies_between: [
      [0, 1],
      [1, 2],
    ],
  },
  {
    pattern: /feature|implement|build|create/i,
    subtask_types: ["dev", "dev", "ops"],
    descriptions: [
      "Design and implement core logic",
      "Write tests and documentation",
      "Set up CI/CD and monitoring",
    ],
    dependencies_between: [[0, 1]],
  },
  {
    pattern: /migrate|upgrade/i,
    subtask_types: ["ops", "dev", "ops", "biz"],
    descriptions: [
      "Prepare backup and rollback plan",
      "Update code for compatibility",
      "Execute migration and verify",
      "Update runbooks and communicate changes",
    ],
    dependencies_between: [
      [0, 2],
      [1, 2],
      [2, 3],
    ],
  },
  {
    pattern: /analyze|report|review/i,
    subtask_types: ["biz", "dev", "biz"],
    descriptions: [
      "Gather data and define metrics",
      "Run analysis and generate artifacts",
      "Synthesize findings into report",
    ],
    dependencies_between: [
      [0, 1],
      [1, 2],
    ],
  },
  {
    pattern: /fix|bug|issue|resolve/i,
    subtask_types: ["dev", "dev", "ops"],
    descriptions: [
      "Reproduce and diagnose root cause",
      "Implement fix and regression tests",
      "Deploy hotfix and verify in production",
    ],
    dependencies_between: [
      [0, 1],
      [1, 2],
    ],
  },
];

export class TaskDecomposer {
  /**
   * Decomposes a task into subtasks based on its description and type.
   * Uses pattern-matching heuristics to determine the decomposition strategy.
   * Falls back to a single-subtask plan if no rule matches.
   */
  decompose(task: Task): SubTask[] {
    const rule = this.findMatchingRule(task);

    if (rule) {
      return this.applyRule(task, rule);
    }

    return this.defaultDecomposition(task);
  }

  private findMatchingRule(task: Task): DecompositionRule | undefined {
    return DECOMPOSITION_RULES.find((rule) =>
      rule.pattern.test(task.description),
    );
  }

  private applyRule(task: Task, rule: DecompositionRule): SubTask[] {
    const subtaskIds: string[] = rule.subtask_types.map(() => randomUUID());

    const subtasks: SubTask[] = rule.subtask_types.map((type, index) => {
      const dependencies: string[] = [];

      if (rule.dependencies_between) {
        for (const [from, to] of rule.dependencies_between) {
          if (to === index) {
            dependencies.push(subtaskIds[from]!);
          }
        }
      }

      return {
        id: subtaskIds[index]!,
        parent_id: task.id,
        description: `${rule.descriptions[index]!} (for: ${task.description})`,
        type,
        priority: this.inheritPriority(task.priority, index, rule.subtask_types.length),
        status: "pending" as const,
        dependencies,
        created_at: new Date(),
      };
    });

    return subtasks;
  }

  private defaultDecomposition(task: Task): SubTask[] {
    return [
      {
        id: randomUUID(),
        parent_id: task.id,
        description: task.description,
        type: task.type,
        priority: task.priority,
        status: "pending",
        dependencies: [],
        created_at: new Date(),
      },
    ];
  }

  /**
   * Earlier subtasks in a critical chain inherit the parent priority.
   * Later subtasks may be slightly deprioritized if the parent is not critical.
   */
  private inheritPriority(
    parentPriority: TaskPriority,
    index: number,
    total: number,
  ): TaskPriority {
    if (parentPriority === "critical") {
      return "critical";
    }

    const isLateTask = index >= Math.ceil(total / 2);

    if (isLateTask && parentPriority === "high") {
      return "normal";
    }

    return parentPriority;
  }
}
