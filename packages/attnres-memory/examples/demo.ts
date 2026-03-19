/**
 * @factory/attnres-memory — Demo
 *
 * Run: npx tsx examples/demo.ts
 */

import { InMemoryAdapter } from '../src/adapters/inmemory-adapter.js';
import { AttnResAgent } from '../src/agents/attnres-agent.js';

async function main(): Promise<void> {
  console.log('=== AttnRes Memory Demo ===\n');

  // 1. Create an agent backed by in-memory storage.
  const adapter = new InMemoryAdapter();
  const agent = new AttnResAgent(adapter, {
    max_blocks: 100,
    attention_threshold: 0.05,
    decay_interval_ms: 0, // disable automatic decay for the demo
  });

  // 2. Store some memories with varying importance and types.
  console.log('Storing memories...\n');

  await agent.remember(
    'The user prefers dark mode across all applications.',
    0.9,
    { category: 'preferences' },
    'foundational',
  );

  await agent.remember(
    'The user is building a SaaS product for developer tooling.',
    0.8,
    { category: 'context' },
    'relevant',
  );

  await agent.remember(
    'Last session we discussed TypeScript generic constraints.',
    0.5,
    { category: 'conversation' },
    'recent',
  );

  await agent.remember(
    'The user asked about Supabase row-level security policies.',
    0.6,
    { category: 'conversation' },
    'recent',
  );

  await agent.remember(
    'The user mentioned they work remotely from Lisbon, Portugal.',
    0.4,
    { category: 'personal' },
    'relevant',
  );

  // 3. Query the reservoir.
  console.log('--- Query: "user preferences" ---');
  const prefResult = await agent.recall('user preferences', 3);
  for (const block of prefResult.blocks) {
    const score = prefResult.attention_scores.get(block.id)?.toFixed(3) ?? '?';
    console.log(`  [${score}] (${block.block_type}) ${block.content}`);
  }
  console.log(`  Tokens used: ${prefResult.total_tokens_used}\n`);

  console.log('--- Query: "TypeScript Supabase" ---');
  const techResult = await agent.recall('TypeScript Supabase', 3);
  for (const block of techResult.blocks) {
    const score = techResult.attention_scores.get(block.id)?.toFixed(3) ?? '?';
    console.log(`  [${score}] (${block.block_type}) ${block.content}`);
  }
  console.log(`  Tokens used: ${techResult.total_tokens_used}\n`);

  // 4. Show statistics.
  console.log('--- Stats ---');
  const stats = await agent.getStats();
  console.log(`  Total blocks:       ${stats.total_blocks}`);
  console.log(`  By type:            ${JSON.stringify(stats.blocks_by_type)}`);
  console.log(`  Avg importance:     ${stats.average_importance.toFixed(3)}`);
  console.log(`  Total access count: ${stats.total_access_count}\n`);

  // 5. Run maintenance (decay + prune).
  console.log('Running maintenance (decay + prune below 0.3)...');
  const pruned = await agent.maintain(0.3);
  console.log(`  Pruned ${pruned} block(s)\n`);

  const statsAfter = await agent.getStats();
  console.log('--- Stats after maintenance ---');
  console.log(`  Total blocks:   ${statsAfter.total_blocks}`);
  console.log(`  Avg importance: ${statsAfter.average_importance.toFixed(3)}\n`);

  // 6. Clean up.
  agent.stop();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
