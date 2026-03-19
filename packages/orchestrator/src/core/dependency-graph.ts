/**
 * @factory/orchestrator - Dependency Graph
 *
 * Directed acyclic graph (DAG) for task dependencies.
 * Provides topological sorting, cycle detection, and
 * parallelizable execution layer computation.
 */

export class DependencyGraph {
  private readonly adjacency: Map<string, Set<string>> = new Map();
  private readonly reverseAdj: Map<string, Set<string>> = new Map();

  /**
   * Adds a node to the graph. Idempotent.
   */
  addNode(id: string): void {
    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, new Set());
    }
    if (!this.reverseAdj.has(id)) {
      this.reverseAdj.set(id, new Set());
    }
  }

  /**
   * Adds a directed edge: `from` must complete before `to` can start.
   * Both nodes are implicitly created if they don't exist.
   */
  addEdge(from: string, to: string): void {
    this.addNode(from);
    this.addNode(to);
    this.adjacency.get(from)!.add(to);
    this.reverseAdj.get(to)!.add(from);
  }

  /**
   * Returns the direct dependencies (predecessors) of a node.
   */
  getDependencies(id: string): string[] {
    const deps = this.reverseAdj.get(id);
    return deps ? [...deps] : [];
  }

  /**
   * Returns the direct dependents (successors) of a node.
   */
  getDependents(id: string): string[] {
    const deps = this.adjacency.get(id);
    return deps ? [...deps] : [];
  }

  /**
   * Detects whether the graph contains a cycle using iterative DFS
   * with three-color marking (white/gray/black).
   */
  hasCycle(): boolean {
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;

    const color = new Map<string, number>();
    for (const node of this.adjacency.keys()) {
      color.set(node, WHITE);
    }

    for (const node of this.adjacency.keys()) {
      if (color.get(node) !== WHITE) continue;

      const stack: Array<{ node: string; childrenVisited: boolean }> = [
        { node, childrenVisited: false },
      ];

      while (stack.length > 0) {
        const frame = stack[stack.length - 1]!;

        if (!frame.childrenVisited) {
          color.set(frame.node, GRAY);
          frame.childrenVisited = true;

          const neighbors = this.adjacency.get(frame.node);
          if (neighbors) {
            for (const neighbor of neighbors) {
              const neighborColor = color.get(neighbor);
              if (neighborColor === GRAY) {
                return true;
              }
              if (neighborColor === WHITE) {
                stack.push({ node: neighbor, childrenVisited: false });
              }
            }
          }
        } else {
          color.set(frame.node, BLACK);
          stack.pop();
        }
      }
    }

    return false;
  }

  /**
   * Computes execution layers via Kahn's algorithm (BFS topological sort).
   * Each layer contains tasks that can run in parallel; layers must be
   * executed sequentially.
   *
   * Throws if the graph contains a cycle.
   */
  getExecutionOrder(): string[][] {
    if (this.hasCycle()) {
      throw new Error(
        "Cannot compute execution order: dependency graph contains a cycle",
      );
    }

    const inDegree = new Map<string, number>();
    for (const node of this.adjacency.keys()) {
      inDegree.set(node, 0);
    }

    for (const [, neighbors] of this.adjacency) {
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) + 1);
      }
    }

    // Seed the first layer with all zero-indegree nodes.
    let currentLayer: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        currentLayer.push(node);
      }
    }

    const layers: string[][] = [];

    while (currentLayer.length > 0) {
      layers.push([...currentLayer]);

      const nextLayer: string[] = [];

      for (const node of currentLayer) {
        const neighbors = this.adjacency.get(node);
        if (!neighbors) continue;

        for (const neighbor of neighbors) {
          const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
          inDegree.set(neighbor, newDegree);
          if (newDegree === 0) {
            nextLayer.push(neighbor);
          }
        }
      }

      currentLayer = nextLayer;
    }

    return layers;
  }

  /**
   * Returns all node IDs in the graph.
   */
  getNodes(): string[] {
    return [...this.adjacency.keys()];
  }

  /**
   * Serializes the graph to a plain Map suitable for storing in an ExecutionPlan.
   */
  toMap(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const [node, neighbors] of this.adjacency) {
      result.set(node, [...neighbors]);
    }
    return result;
  }

  /**
   * Reconstructs a DependencyGraph from a serialized Map.
   */
  static fromMap(map: Map<string, string[]>): DependencyGraph {
    const graph = new DependencyGraph();
    for (const [node, neighbors] of map) {
      graph.addNode(node);
      for (const neighbor of neighbors) {
        graph.addEdge(node, neighbor);
      }
    }
    return graph;
  }
}
