// Registry tests — Run: npx tsx tests/registry.test.ts

import {
  findTemplates, getTemplate, incrementReuse,
  promoteTemplate, registrySummary, REGISTRY,
} from '../src/registry.js'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  OK:   ${name}`)
    passed++
  } catch (err) {
    console.log(`  FAIL: ${name}: ${(err as Error).message}`)
    failed++
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

console.log('\nTemplate Registry\n' + '-'.repeat(40))

test('Registry has 5 scaffold templates', () => {
  assert(REGISTRY.length === 5, `Expected 5, got ${REGISTRY.length}`)
})

test('All templates have required fields', () => {
  for (const t of REGISTRY) {
    assert(!!t.id,          `Missing id`)
    assert(!!t.name,        `${t.id} missing name`)
    assert(!!t.description, `${t.id} missing description`)
    assert(!!t.component,   `${t.id} missing component`)
    assert(Array.isArray(t.props), `${t.id} props must be array`)
    assert(Array.isArray(t.tags),  `${t.id} tags must be array`)
  }
})

test('findTemplates by category', () => {
  const r = findTemplates({ category: 'auth' })
  assert(r.length >= 1, 'Should find auth template')
  assert(r.every(t => t.category === 'auth'), 'All should be auth')
})

test('findTemplates by tag', () => {
  const r = findTemplates({ tags: ['stripe'] })
  assert(r.length >= 1, 'Should find stripe template')
  assert(r.every(t => t.tags.includes('stripe')), 'All should have stripe tag')
})

test('findTemplates by search', () => {
  const r = findTemplates({ search: 'social login' })
  assert(r.length >= 1, 'Should find AuthScreen')
})

test('getTemplate returns correct entry', () => {
  const t = getTemplate('auth-social-login')
  assert(!!t, 'Should find auth-social-login')
  assert(t?.id === 'auth-social-login', 'Correct ID')
})

test('getTemplate returns undefined for unknown', () => {
  assert(getTemplate('xxx') === undefined, 'Should be undefined')
})

test('incrementReuse tracks usage', () => {
  const before = getTemplate('auth-social-login')!.reuse_count
  incrementReuse('auth-social-login', 'test-product')
  const after = getTemplate('auth-social-login')!.reuse_count
  assert(after === before + 1, `Should increment: ${before} -> ${after}`)
  assert(getTemplate('auth-social-login')!.first_used_in === 'test-product', 'first_used_in set')
})

test('promoteTemplate updates status', () => {
  promoteTemplate('auth-social-login', 'in-progress', 'Test notes')
  const t = getTemplate('auth-social-login')!
  assert(t.status === 'in-progress', 'Status updated')
  assert(t.notes === 'Test notes', 'Notes updated')
})

test('registrySummary returns formatted string', () => {
  const s = registrySummary()
  assert(s.includes('Template Registry'), 'Has header')
  assert(s.includes('auth-social-login'), 'Has template IDs')
})

console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(`${'='.repeat(40)}\n`)

if (failed > 0) process.exit(1)
