/**
 * @factory/orchestrator - Tests
 *
 * Assert-based tests for decomposition, dependency graph,
 * and end-to-end orchestration flow.
 */

import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { TaskDecomposer } from "../src/core/decomposer.js";
import { DependencyGraph } from "../src/core/dependency-graph.js";
import { Orchestrator } from "../src/core/orchestrator.js";
import { AgentRunner } from "../src/execution/agent-runner.js";
import { ParallelExecutor } from "../src/execution/parallel-executor.js";
import { ResultMerger } from "../src/execution/result-merger.js";
import type { Task, SubTask, AgentSpec } from "../src/core/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: randomUUID(),
    description: "Deploy the new authentication service",
    type: "meta",
    priority: "high",
    status: "pending",
    dependencies: [],
    created_at: new Date(),
    ...overrides,
  };
}

function createSubTask(overrides: Partial<SubTask> = {}): SubTask {
  return {
    id: randomUUID(),
    parent_id: randomUUID(),
    description: "Test subtask",
    type: "dev",
    priority: "normal",
    status: "pending",
    dependencies: [],
    created_at: new Date(),
    ...overrides,
  };
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>): void {
  const result = fn();
  const handle = (error?: unknown) => {
    if (error) {
      failed++;
      console.error(`  FAIL: ${name}`);
      console.error(`        ${error instanceof Error ? error.message : String(error)}`);
    } else {
      passed++;
      console.log(`  OK:   ${name}`);
    }
  };

  if (result instanceof Promise) {
    result.then(() => handle()).catch(handle);
  } else {
    handle();
  }
}

// ---------------------------------------------------------------------------
// TaskDecomposer tests
// ---------------------------------------------------------------------------

console.log("\nTaskDecomposer");
console.log("-".repeat(40));

test("decomposes a deploy task into multiple subtasks", () => {
  const decomposer = new TaskDecomposer();
  const task = createTask({ description: "Deploy auth service to prod" });
  const subtasks = decomposer.decompose(task);

  assert.ok(subtasks.length > 1, "Should produce multiple subtasks");
  assert.ok(
    subtasks.every((st) => st.parent_id === task.id),
    "All subtasks should reference the parent task",
  );
});

test("decomposes a feature task", () => {
  const decomposer = new TaskDecomposer();
  const task = createTask({ description: "Implement user dashboard" });
  const subtasks = decomposer.decompose(task);

  assert.ok(subtasks.length > 1);
  assert.ok(subtasks.some((st) => st.type === "dev"));
});

test("decomposes a bug fix task", () => {
  const decomposer = new TaskDecomposer();
  const task = createTask({ description: "Fix login timeout bug" });
  const subtasks = decomposer.decompose(task);

  assert.ok(subtasks.length > 1);
  assert.ok(subtasks.some((st) => st.description.includes("Reproduce")));
});

test("falls back to single subtask for unrecognized descriptions", () => {
  const decomposer = new TaskDecomposer();
  const task = createTask({ description: "Do something very unique and unusual" });
  const subtasks = decomposer.decompose(task);

  assert.equal(subtasks.length, 1);
  assert.equal(subtasks[0]!.parent_id, task.id);
});

test("preserves critical priority across all subtasks", () => {
  const decomposer = new TaskDecomposer();
  const task = createTask({
    description: "Deploy critical hotfix",
    priority: "critical",
  });
  const subtasks = decomposer.decompose(task);

  assert.ok(subtasks.every((st) => st.priority === "critical"));
});

test("subtasks have dependency relationships", () => {
  const decomposer = new TaskDecomposer();
  const task = createTask({ description: "Deploy new microservice" });
  const subtasks = decomposer.decompose(task);

  const hasDeps = subtasks.some((st) => st.dependencies.length > 0);
  assert.ok(hasDeps, "At least one subtask should depend on another");
});

// ---------------------------------------------------------------------------
// DependencyGraph tests
// ---------------------------------------------------------------------------

console.log("\nDependencyGraph");
console.log("-".repeat(40));

test("adds nodes and edges", () => {
  const graph = new DependencyGraph();
  graph.addNode("a");
  graph.addNode("b");
  graph.addEdge("a", "b");

  assert.deepEqual(graph.getDependencies("b"), ["a"]);
  assert.deepEqual(graph.getDependents("a"), ["b"]);
});

test("detects no cycle in a DAG", () => {
  const graph = new DependencyGraph();
  graph.addEdge("a", "b");
  graph.addEdge("b", "c");
  graph.addEdge("a", "c");

  assert.equal(graph.hasCycle(), false);
});

test("detects a simple cycle", () => {
  const graph = new DependencyGraph();
  graph.addEdge("a", "b");
  graph.addEdge("b", "c");
  graph.addEdge("c", "a");

  assert.equal(graph.hasCycle(), true);
});

test("detects a self-loop", () => {
  const graph = new DependencyGraph();
  graph.addEdge("a", "a");

  assert.equal(graph.hasCycle(), true);
});

test("computes correct execution layers", () => {
  const graph = new DependencyGraph();
  graph.addEdge("a", "c");
  graph.addEdge("b", "c");
  graph.addEdge("c", "d");

  const layers = graph.getExecutionOrder();

  assert.equal(layers.length, 3);
  // First layer: a, b (no deps, can run in parallel)
  assert.ok(layers[0]!.includes("a"));
  assert.ok(layers[0]!.includes("b"));
  // Second layer: c (depends on a, b)
  assert.deepEqual(layers[1], ["c"]);
  // Third layer: d (depends on c)
  assert.deepEqual(layers[2], ["d"]);
});

test("throws on getExecutionOrder with a cycle", () => {
  const graph = new DependencyGraph();
  graph.addEdge("a", "b");
  graph.addEdge("b", "a");

  assert.throws(
    () => graph.getExecutionOrder(),
    /cycle/i,
  );
});

test("handles isolated nodes", () => {
  const graph = new DependencyGraph();
  graph.addNode("x");
  graph.addNode("y");
  graph.addNode("z");

  const layers = graph.getExecutionOrder();
  assert.equal(layers.length, 1);
  assert.equal(layers[0]!.length, 3);
});

test("serializes and deserializes via toMap/fromMap", () => {
  const graph = new DependencyGraph();
  graph.addEdge("a", "b");
  graph.addEdge("b", "c");

  const map = graph.toMap();
  const restored = DependencyGraph.fromMap(map);

  assert.deepEqual(restored.getDependencies("b"), ["a"]);
  assert.deepEqual(restored.getDependencies("c"), ["b"]);
  assert.equal(restored.hasCycle(), false);
});

// ---------------------------------------------------------------------------
// AgentRunner tests
// ---------------------------------------------------------------------------

console.log("\nAgentRunner");
console.log("-".repeat(40));

test("runs a subtask successfully", async () => {
  const runner = new AgentRunner({ simulatedLatencyMs: 5 });
  const subtask = createSubTask({ type: "dev" });
  const agent: AgentSpec = {
    name: "dev-agent",
    type: "dev",
    capabilities: ["coding", "testing"],
    autonomy_level: "full",
  };

  const result = await runner.run(subtask, agent);

  assert.equal(result.task_id, subtask.id);
  assert.equal(result.status, "completed");
  assert.ok(result.output);
  assert.ok(result.duration_ms >= 0);
});

test("fails when agent type mismatches subtask type", async () => {
  const runner = new AgentRunner({ simulatedLatencyMs: 5 });
  const subtask = createSubTask({ type: "ops" });
  const agent: AgentSpec = {
    name: "dev-agent",
    type: "dev",
    capabilities: ["coding"],
    autonomy_level: "full",
  };

  const result = await runner.run(subtask, agent);

  assert.equal(result.status, "failed");
  assert.ok(result.error?.includes("cannot handle"));
});

// ---------------------------------------------------------------------------
// ParallelExecutor tests
// ---------------------------------------------------------------------------

console.log("\nParallelExecutor");
console.log("-".repeat(40));

test("executes a layer of tasks in parallel", async () => {
  const agents: AgentSpec[] = [
    { name: "dev-agent", type: "dev", capabilities: ["code"], autonomy_level: "full" },
    { name: "ops-agent", type: "ops", capabilities: ["deploy"], autonomy_level: "supervised" },
  ];
  const executor = new ParallelExecutor({ agents });
  const runner = new AgentRunner({ simulatedLatencyMs: 5 });

  const tasks: SubTask[] = [
    createSubTask({ type: "dev" }),
    createSubTask({ type: "ops" }),
  ];

  const results = await executor.executeLayer(tasks, runner);

  assert.equal(results.length, 2);
  assert.ok(results.every((r) => r.status === "completed"));
});

test("uses fallback agent for unregistered types", async () => {
  const executor = new ParallelExecutor();
  const runner = new AgentRunner({ simulatedLatencyMs: 5 });

  const tasks: SubTask[] = [createSubTask({ type: "biz" })];
  const results = await executor.executeLayer(tasks, runner);

  assert.equal(results.length, 1);
  assert.equal(results[0]!.status, "completed");
});

// ---------------------------------------------------------------------------
// ResultMerger tests
// ---------------------------------------------------------------------------

console.log("\nResultMerger");
console.log("-".repeat(40));

test("merges results into a summary", () => {
  const merger = new ResultMerger();
  const results = new Map([
    ["t1", { task_id: "t1", status: "completed" as const, output: "Done", duration_ms: 100 }],
    ["t2", { task_id: "t2", status: "failed" as const, error: "Timeout", duration_ms: 200 }],
  ]);

  const summary = merger.merge(results);

  assert.ok(summary.includes("Total tasks: 2"));
  assert.ok(summary.includes("Completed:   1"));
  assert.ok(summary.includes("Failed:      1"));
  assert.ok(summary.includes("50.0%"));
});

test("handles empty results", () => {
  const merger = new ResultMerger();
  const summary = merger.merge(new Map());

  assert.ok(summary.includes("No tasks were executed"));
});

// ---------------------------------------------------------------------------
// Orchestrator integration tests
// ---------------------------------------------------------------------------

console.log("\nOrchestrator (integration)");
console.log("-".repeat(40));

test("plans a complex task", () => {
  const orchestrator = new Orchestrator({ simulatedLatencyMs: 5 });
  const task = createTask({ description: "Deploy analytics pipeline" });
  const plan = orchestrator.plan(task);

  assert.ok(plan.id);
  assert.ok(plan.subtasks.length > 1);
  assert.ok(plan.dependency_graph.size > 0);
  assert.ok(plan.estimated_duration_ms! > 0);
  assert.equal(plan.original_task.id, task.id);
});

test("executes a plan end-to-end", async () => {
  const agents: AgentSpec[] = [
    { name: "dev-agent", type: "dev", capabilities: ["code", "test"], autonomy_level: "full" },
    { name: "ops-agent", type: "ops", capabilities: ["deploy", "monitor"], autonomy_level: "supervised" },
    { name: "biz-agent", type: "biz", capabilities: ["report", "notify"], autonomy_level: "manual" },
  ];

  const orchestrator = new Orchestrator({
    agents,
    simulatedLatencyMs: 5,
  });

  const task = createTask({ description: "Deploy new reporting feature" });
  const plan = orchestrator.plan(task);
  const result = await orchestrator.execute(plan);

  assert.equal(result.plan_id, plan.id);
  assert.ok(result.total_duration_ms >= 0);
  assert.ok(result.summary.length > 0);
  assert.equal(result.success, true);
  assert.equal(result.results.size, plan.subtasks.length);
});

test("handles a simple single-subtask plan", async () => {
  const orchestrator = new Orchestrator({ simulatedLatencyMs: 5 });
  const task = createTask({ description: "Something very unusual" });
  const plan = orchestrator.plan(task);

  assert.equal(plan.subtasks.length, 1);

  const result = await orchestrator.execute(plan);
  assert.equal(result.success, true);
  assert.equal(result.results.size, 1);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

// Allow async tests to complete before printing summary.
setTimeout(() => {
  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(40)}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}, 500);
