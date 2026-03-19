/**
 * @factory/attnres-memory — Test suite
 *
 * Runs against the InMemoryAdapter so no external services are needed.
 * Uses Node.js built-in `assert` — no test framework required.
 *
 * Run: npx tsx tests/attnres.test.ts
 */

import assert from 'node:assert/strict';
import { InMemoryAdapter } from '../src/adapters/inmemory-adapter.js';
import { AttnResEngine } from '../src/core/engine.js';
import { BiasRegistry } from '../src/core/bias-registry.js';
import { AttnResAgent } from '../src/agents/attnres-agent.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : err}`);
  }
}

// ── BiasRegistry Tests ──────────────────────────────────────────────────────

console.log('\nBiasRegistry');

await test('ships with default biases', async () => {
  const reg = new BiasRegistry();
  const all = reg.getAll();
  assert.equal(all['recency'], 0.3);
  assert.equal(all['importance'], 0.4);
  assert.equal(all['frequency'], 0.2);
  assert.equal(all['relevance'], 0.1);
});

await test('register and get a custom bias', async () => {
  const reg = new BiasRegistry();
  reg.register('custom', 0.55);
  assert.equal(reg.get('custom'), 0.55);
});

await test('remove a bias', async () => {
  const reg = new BiasRegistry();
  assert.equal(reg.remove('recency'), true);
  assert.equal(reg.get('recency'), undefined);
});

await test('rejects negative weights', async () => {
  const reg = new BiasRegistry();
  assert.throws(() => reg.register('bad', -1), RangeError);
});

// ── InMemoryAdapter Tests ───────────────────────────────────────────────────

console.log('\nInMemoryAdapter');

await test('store and retrieve a block', async () => {
  const adapter = new InMemoryAdapter();
  const block = await adapter.store({
    id: 'test-1',
    content: 'TypeScript is great for building robust systems.',
    importance: 0.8,
    block_type: 'relevant',
    metadata: { source: 'test' },
    created_at: new Date().toISOString(),
    last_accessed: new Date().toISOString(),
    access_count: 0,
    decay_rate: 0.95,
  });

  assert.equal(block.id, 'test-1');
  const results = await adapter.retrieve('TypeScript robust', 10);
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'test-1');
});

await test('update a block partially', async () => {
  const adapter = new InMemoryAdapter();
  await adapter.store({
    id: 'test-2',
    content: 'Original content',
    importance: 0.5,
    block_type: 'recent',
    metadata: {},
    created_at: new Date().toISOString(),
    last_accessed: new Date().toISOString(),
    access_count: 0,
    decay_rate: 0.95,
  });

  const updated = await adapter.update('test-2', { importance: 0.9 });
  assert.equal(updated.importance, 0.9);
  assert.equal(updated.content, 'Original content');
});

await test('delete a block', async () => {
  const adapter = new InMemoryAdapter();
  await adapter.store({
    id: 'test-3',
    content: 'To be deleted',
    importance: 0.1,
    block_type: 'recent',
    metadata: {},
    created_at: new Date().toISOString(),
    last_accessed: new Date().toISOString(),
    access_count: 0,
    decay_rate: 0.95,
  });

  assert.equal(await adapter.delete('test-3'), true);
  assert.equal(await adapter.delete('test-3'), false); // already gone
  const all = await adapter.getAll();
  assert.equal(all.length, 0);
});

await test('getAll returns all stored blocks', async () => {
  const adapter = new InMemoryAdapter();
  const now = new Date().toISOString();
  const base = {
    content: 'x',
    importance: 0.5,
    block_type: 'recent' as const,
    metadata: {},
    created_at: now,
    last_accessed: now,
    access_count: 0,
    decay_rate: 0.95,
  };

  await adapter.store({ ...base, id: 'a' });
  await adapter.store({ ...base, id: 'b' });
  await adapter.store({ ...base, id: 'c' });

  const all = await adapter.getAll();
  assert.equal(all.length, 3);
});

// ── AttnResEngine Tests ────────────────────────────────────────────────────

console.log('\nAttnResEngine');

await test('add and query memories', async () => {
  const adapter = new InMemoryAdapter();
  const engine = new AttnResEngine(adapter, { decay_interval_ms: 0 });

  await engine.addMemory(
    'The user prefers dark mode for all applications.',
    0.9,
    'foundational',
    { category: 'preferences' },
  );
  await engine.addMemory(
    'Last session the user asked about TypeScript generics.',
    0.6,
    'recent',
  );
  await engine.addMemory(
    'The user works at a startup building developer tools.',
    0.7,
    'relevant',
    { category: 'context' },
  );

  const result = await engine.query('user preferences dark mode', 5);
  assert.ok(result.blocks.length > 0, 'Should return at least one block');
  assert.ok(result.attention_scores.size > 0, 'Should have attention scores');
  assert.ok(result.total_tokens_used > 0, 'Should report token usage');

  engine.stop();
});

await test('decay reduces importance', async () => {
  const adapter = new InMemoryAdapter();
  const engine = new AttnResEngine(adapter, { decay_interval_ms: 0 });

  await engine.addMemory('Ephemeral fact', 0.5, 'recent');
  await engine.decayMemories();

  const all = await adapter.getAll();
  assert.ok(all[0].importance < 0.5, 'Importance should decrease after decay');

  engine.stop();
});

await test('pruneBelow removes low-importance blocks', async () => {
  const adapter = new InMemoryAdapter();
  const engine = new AttnResEngine(adapter, { decay_interval_ms: 0 });

  await engine.addMemory('High importance', 0.9, 'foundational');
  await engine.addMemory('Low importance', 0.02, 'recent');

  const pruned = await engine.pruneBelow(0.05);
  assert.equal(pruned, 1);

  const remaining = await adapter.getAll();
  assert.equal(remaining.length, 1);
  assert.ok(remaining[0].content.includes('High'));

  engine.stop();
});

await test('respects max_blocks by evicting lowest scored', async () => {
  const adapter = new InMemoryAdapter();
  const engine = new AttnResEngine(adapter, {
    max_blocks: 2,
    decay_interval_ms: 0,
  });

  await engine.addMemory('First memory', 0.3, 'recent');
  await engine.addMemory('Second memory', 0.8, 'relevant');
  // This should evict the lowest-scored block to make room.
  await engine.addMemory('Third memory', 0.9, 'foundational');

  const all = await adapter.getAll();
  assert.equal(all.length, 2, 'Should not exceed max_blocks');

  engine.stop();
});

// ── AttnResAgent Tests ──────────────────────────────────────────────────────

console.log('\nAttnResAgent');

await test('remember and recall', async () => {
  const adapter = new InMemoryAdapter();
  const agent = new AttnResAgent(adapter, { decay_interval_ms: 0 });

  const mem = await agent.remember(
    'The capital of France is Paris.',
    0.7,
    { source: 'geography' },
  );
  assert.ok(mem.id, 'Should have an ID');
  assert.equal(mem.importance, 0.7);

  const result = await agent.recall('capital France');
  assert.ok(result.blocks.length > 0);

  agent.stop();
});

await test('forget removes a memory', async () => {
  const adapter = new InMemoryAdapter();
  const agent = new AttnResAgent(adapter, { decay_interval_ms: 0 });

  const mem = await agent.remember('Secret data', 0.5);
  assert.equal(await agent.forget(mem.id), true);

  const stats = await agent.getStats();
  assert.equal(stats.total_blocks, 0);

  agent.stop();
});

await test('getStats returns correct aggregates', async () => {
  const adapter = new InMemoryAdapter();
  const agent = new AttnResAgent(adapter, { decay_interval_ms: 0 });

  await agent.remember('A', 0.4, {}, 'recent');
  await agent.remember('B', 0.6, {}, 'relevant');
  await agent.remember('C', 0.8, {}, 'foundational');

  const stats = await agent.getStats();
  assert.equal(stats.total_blocks, 3);
  assert.equal(stats.blocks_by_type.recent, 1);
  assert.equal(stats.blocks_by_type.relevant, 1);
  assert.equal(stats.blocks_by_type.foundational, 1);
  assert.ok(
    Math.abs(stats.average_importance - 0.6) < 0.001,
    'Average importance should be ~0.6',
  );

  agent.stop();
});

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
