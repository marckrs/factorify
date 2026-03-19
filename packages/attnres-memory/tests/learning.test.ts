// Learning Layer — Test Suite
// Run: npx tsx tests/learning.test.ts

import { LearningLayer } from '../src/learning/learning-layer.js'
import type { SubtaskInfo, SubtaskResult } from '../src/learning/learning-layer.js'
import { InMemoryAdapter } from '../src/adapters/inmemory-adapter.js'
import { AttnResEngine }   from '../src/core/engine.js'

let passed = 0
let failed = 0

function test(name: string, fn: () => Promise<void>) {
  return { name, fn }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

// Mock Anthropic client
function makeMockClient(response: object) {
  return {
    messages: {
      async create() {
        return { content: [{ type: 'text' as const, text: JSON.stringify(response) }] }
      }
    }
  }
}

function makeSubtask(overrides: Partial<SubtaskInfo> = {}): SubtaskInfo {
  return {
    id: 'st_1', description: 'build JWT authentication',
    type: 'dev', agent: 'code-smith', priority: 'normal',
    ...overrides,
  }
}

function makeResult(overrides: Partial<SubtaskResult> = {}): SubtaskResult {
  return {
    task_id: 'st_1', status: 'failed',
    output: 'Error: Cannot find module jose',
    success: false, error: 'Module not found: jose',
    duration_ms: 5000,
    ...overrides,
  }
}

const tests = [
  test('stores learning on failure', async () => {
    const adapter = new InMemoryAdapter()
    const client  = makeMockClient({
      has_learning: true,
      summary: 'jose import must use named export',
      learnings: [{
        category: 'tool_usage',
        title: 'jose library requires named import in ESM',
        description: 'Import as: import { SignJWT } from "jose"',
        evidence: 'Cannot find module jose',
      }]
    })

    const layer = new LearningLayer(client, adapter)
    const analysis = await layer.analyze(makeSubtask(), makeResult(), 'session_1')

    assert(analysis.has_learning, 'should detect learning')
    assert(analysis.learnings.length === 1, 'should have 1 learning')
    assert(adapter.size > 0, 'should store in AttnRes')
  }),

  test('skips successful fast executions', async () => {
    const adapter = new InMemoryAdapter()
    const client  = makeMockClient({ has_learning: false, learnings: [], summary: '' })
    const layer   = new LearningLayer(client, adapter)

    const analysis = await layer.analyze(
      makeSubtask(),
      makeResult({ success: true, error: undefined, duration_ms: 5000 }),
      'session_1'
    )

    assert(!analysis.has_learning, 'should not learn from fast success')
    assert(adapter.size === 0, 'should not store anything')
  }),

  test('escalates importance after 3 occurrences', async () => {
    const adapter = new InMemoryAdapter()
    const client  = makeMockClient({
      has_learning: true,
      summary: 'recurring error',
      learnings: [{
        category: 'error_pattern',
        title: 'jose module not found',
        description: 'Always use named import for jose in ESM',
        evidence: 'Cannot find module',
      }]
    })

    const layer = new LearningLayer(client, adapter)

    for (let i = 0; i < 3; i++) {
      await layer.analyze(makeSubtask(), makeResult(), `session_${i}`)
    }

    const memories = await adapter.getAll()
    const maxImportance = Math.max(...memories.map(m => m.importance))
    assert(maxImportance >= 0.90, `3rd should reach >= 0.90, got ${maxImportance}`)

    const foundational = memories.filter(m => m.block_type === 'foundational')
    assert(foundational.length > 0, 'should promote to foundational tier')
  }),

  test('never crashes the pipeline on API error', async () => {
    const adapter = new InMemoryAdapter()
    const badClient = {
      messages: {
        async create() { throw new Error('API down') }
      }
    }

    const layer = new LearningLayer(badClient, adapter)
    const analysis = await layer.analyze(makeSubtask(), makeResult(), 'session_1')

    assert(!analysis.has_learning, 'should return false on API error')
    assert(adapter.size === 0, 'should not store on error')
  }),

  test('learned context retrievable via AttnRes query', async () => {
    const adapter = new InMemoryAdapter()
    const engine  = new AttnResEngine(adapter)
    const client  = makeMockClient({
      has_learning: true,
      summary: 'jose ESM import pattern',
      learnings: [{
        category: 'tool_usage',
        title: 'jose ESM named import required',
        description: 'Use: import { SignJWT } from "jose"',
        evidence: 'Cannot find module jose',
      }]
    })

    const layer = new LearningLayer(client, adapter)
    await layer.analyze(makeSubtask(), makeResult(), 'session_1')

    const result = await engine.query('jose JWT authentication', 5)
    assert(result.blocks.length > 0, 'should retrieve stored learning')
    const hasLearning = result.blocks.some(b =>
      b.content.includes('LEARNING') || b.content.includes('jose')
    )
    assert(hasLearning, 'retrieved context should contain the learning')
  }),
]

async function run() {
  console.log('\nLearningLayer\n' + '-'.repeat(40))

  for (const { name, fn } of tests) {
    try {
      await fn()
      console.log(`  OK:   ${name}`)
      passed++
    } catch (err) {
      console.log(`  FAIL: ${name}`)
      console.log(`        ${(err as Error).message}`)
      failed++
    }
  }

  console.log(`\n${'='.repeat(40)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`${'='.repeat(40)}\n`)

  if (failed > 0) process.exit(1)
}

run().catch(err => { console.error(err); process.exit(1) })
