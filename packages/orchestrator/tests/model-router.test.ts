// Model Router tests — Run: npx tsx tests/model-router.test.ts

import { routeToModel, estimateMonthlySavings } from '../src/core/model-router.js'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try { fn(); console.log(`  OK:   ${name}`); passed++ }
  catch (e) { console.log(`  FAIL: ${name}: ${(e as Error).message}`); failed++ }
}

function assert(c: boolean, m: string) { if (!c) throw new Error(m) }

console.log('\nModel Router\n' + '-'.repeat(40))

test('orchestrator always routes to sonnet', () => {
  const r = routeToModel({ agent: 'orchestrator', task: 'any task' })
  assert(r.tier === 'sonnet', `Expected sonnet, got ${r.tier}`)
})

test('monitor routes to haiku by default', () => {
  const r = routeToModel({ agent: 'monitor', task: 'check system health' })
  assert(r.tier === 'haiku', `Expected haiku, got ${r.tier}`)
})

test('monitor upgrades to sonnet for complex task', () => {
  const r = routeToModel({ agent: 'monitor', task: 'analyze and architect new monitoring strategy' })
  assert(r.tier === 'sonnet', `Expected sonnet`)
})

test('critical priority always routes to sonnet', () => {
  const r = routeToModel({ agent: 'biz-analyst', task: 'list counts', priority: 'critical' })
  assert(r.tier === 'sonnet', `Critical should be sonnet`)
})

test('code-smith defaults to sonnet', () => {
  const r = routeToModel({ agent: 'code-smith', task: 'build a function' })
  assert(r.tier === 'sonnet', `Expected sonnet for code`)
})

test('test-engineer defaults to haiku', () => {
  const r = routeToModel({ agent: 'test-engineer', task: 'write unit tests' })
  assert(r.tier === 'haiku', `Expected haiku for test`)
})

test('savings estimation is correct', () => {
  const s = estimateMonthlySavings({
    avg_tasks_per_day: 10, avg_tokens_per_task: 5000, haiku_pct: 0.5,
  })
  assert(s.savings_pct > 0, 'Should have savings')
  assert(s.with_routing_usd < s.without_routing_usd, 'Routing should be cheaper')
  assert(s.savings_pct < 100, 'Cannot save 100%')
})

test('routing decision includes reasoning', () => {
  const r = routeToModel({ agent: 'code-smith', task: 'build auth system' })
  assert(r.reasoning.length > 0, 'Should have reasoning')
  assert(r.cost_multiplier > 0, 'Should have cost multiplier')
})

console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(`${'='.repeat(40)}\n`)

if (failed > 0) process.exit(1)
