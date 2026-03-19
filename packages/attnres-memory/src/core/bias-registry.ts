/**
 * @factory/attnres-memory — Bias Registry
 *
 * Manages named attention bias weights that the AttnRes engine uses when
 * computing composite attention scores for memory blocks.
 */

/** Default bias weights shipped with every new registry instance. */
const DEFAULT_BIASES: ReadonlyMap<string, number> = new Map<string, number>([
  ['recency', 0.3],
  ['importance', 0.4],
  ['frequency', 0.2],
  ['relevance', 0.1],
]);

/**
 * A mutable registry of named bias weights.
 *
 * Bias names are arbitrary strings; weights are unsigned numbers that the
 * engine normalises before use, so they do not need to sum to 1.
 */
export class BiasRegistry {
  private readonly biases: Map<string, number>;

  constructor() {
    this.biases = new Map(DEFAULT_BIASES);
  }

  // ── Mutators ────────────────────────────────────────────────────────────

  /**
   * Register (or overwrite) a named bias weight.
   *
   * @param name   - Unique identifier for the bias (e.g. `"recency"`).
   * @param weight - Non-negative weight value.
   * @throws {RangeError} If `weight` is negative.
   */
  register(name: string, weight: number): void {
    if (weight < 0) {
      throw new RangeError(`Bias weight must be non-negative, got ${weight}`);
    }
    this.biases.set(name, weight);
  }

  /**
   * Remove a bias by name.
   *
   * @returns `true` if the bias existed and was removed.
   */
  remove(name: string): boolean {
    return this.biases.delete(name);
  }

  // ── Accessors ───────────────────────────────────────────────────────────

  /**
   * Retrieve a single bias weight by name.
   *
   * @returns The weight, or `undefined` if no such bias is registered.
   */
  get(name: string): number | undefined {
    return this.biases.get(name);
  }

  /**
   * Return a **snapshot** of all currently registered biases.
   *
   * Callers receive a plain object so that mutations do not leak back into
   * the registry.
   */
  getAll(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of this.biases) {
      out[k] = v;
    }
    return out;
  }
}
