/**
 * @factory/orchestrator - Demo
 *
 * Demonstrates creating an Orchestrator, planning a complex task,
 * executing the plan, and inspecting the results.
 */

import { randomUUID } from "node:crypto";
import { Orchestrator } from "../src/core/orchestrator.js";
import type { Task, AgentSpec } from "../src/core/types.js";

// ---------------------------------------------------------------------------
// Configure agents
// ---------------------------------------------------------------------------

const agents: AgentSpec[] = [
  {
    name: "code-smith",
    type: "dev",
    capabilities: ["typescript", "rust", "testing", "code-review"],
    autonomy_level: "full",
  },
  {
    name: "infra-pilot",
    type: "ops",
    capabilities: ["kubernetes", "terraform", "monitoring", "ci-cd"],
    autonomy_level: "supervised",
  },
  {
    name: "biz-analyst",
    type: "biz",
    capabilities: ["reporting", "stakeholder-comms", "documentation"],
    autonomy_level: "manual",
  },
];

// ---------------------------------------------------------------------------
// Create and run the orchestrator
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const orchestrator = new Orchestrator({
    agents,
    simulatedLatencyMs: 100,
  });

  // Define a complex task.
  const task: Task = {
    id: randomUUID(),
    description: "Deploy the new real-time analytics pipeline to production",
    type: "meta",
    priority: "high",
    status: "pending",
    dependencies: [],
    created_at: new Date(),
  };

  console.log("=".repeat(60));
  console.log("@factory/orchestrator - Demo");
  console.log("=".repeat(60));
  console.log();

  // Phase 1: Planning
  console.log("Phase 1: Planning");
  console.log("-".repeat(40));

  const plan = orchestrator.plan(task);

  console.log(`Plan ID:       ${plan.id}`);
  console.log(`Original task: ${plan.original_task.description}`);
  console.log(`Subtasks:      ${plan.subtasks.length}`);
  console.log(`Est. duration: ${plan.estimated_duration_ms}ms`);
  console.log();

  console.log("Subtasks:");
  for (const subtask of plan.subtasks) {
    const deps =
      subtask.dependencies.length > 0
        ? ` (depends on: ${subtask.dependencies.map((d) => d.slice(0, 8)).join(", ")})`
        : " (no dependencies)";
    console.log(`  [${subtask.type.toUpperCase().padEnd(3)}] ${subtask.id.slice(0, 8)}... ${subtask.description.slice(0, 60)}${deps}`);
  }
  console.log();

  // Phase 2: Execution
  console.log("Phase 2: Execution");
  console.log("-".repeat(40));

  const result = await orchestrator.execute(plan);

  console.log();
  console.log(result.summary);
  console.log();

  // Phase 3: Verdict
  console.log("Phase 3: Verdict");
  console.log("-".repeat(40));
  console.log(`Success:        ${result.success}`);
  console.log(`Total duration: ${result.total_duration_ms}ms`);
  console.log(`Tasks run:      ${result.results.size}`);
  console.log();

  // Run a second example with a different task type.
  console.log("=".repeat(60));
  console.log("Second example: Migration task");
  console.log("=".repeat(60));
  console.log();

  const migrationTask: Task = {
    id: randomUUID(),
    description: "Migrate user database from PostgreSQL 14 to 16",
    type: "meta",
    priority: "critical",
    status: "pending",
    dependencies: [],
    created_at: new Date(),
  };

  const migrationPlan = orchestrator.plan(migrationTask);
  console.log(`Subtasks: ${migrationPlan.subtasks.length}`);
  for (const st of migrationPlan.subtasks) {
    console.log(`  [${st.type.toUpperCase().padEnd(3)}] ${st.priority.padEnd(8)} ${st.description.slice(0, 70)}`);
  }
  console.log();

  const migrationResult = await orchestrator.execute(migrationPlan);
  console.log(`Success: ${migrationResult.success}`);
  console.log(`Duration: ${migrationResult.total_duration_ms}ms`);
  console.log();
}

main().catch((error) => {
  console.error("Demo failed:", error);
  process.exit(1);
});
