// @factory/mcp-servers — unit tests

import { GitHubMCP } from '../src/github.js'
import { VercelMCP } from '../src/vercel.js'
import { createMCPClients } from '../src/index.js'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  OK:   ${name}`)
    passed++
  } catch (err) {
    console.log(`  FAIL: ${name} — ${(err as Error).message}`)
    failed++
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg)
}

console.log('\nGitHubMCP\n' + '-'.repeat(40))

test('creates instance with config', () => {
  const gh = new GitHubMCP({ owner: 'test', repo: 'repo', token: 'tok' })
  assert(gh !== undefined, 'Expected instance')
})

console.log('\nVercelMCP\n' + '-'.repeat(40))

test('creates instance with config', () => {
  const vc = new VercelMCP({ token: 'tok', org_id: 'org' })
  assert(vc !== undefined, 'Expected instance')
})

console.log('\ncreateMCPClients\n' + '-'.repeat(40))

test('returns github and vercel clients', () => {
  const clients = createMCPClients()
  assert('github' in clients, 'Expected github client')
  assert('vercel' in clients, 'Expected vercel client')
})

console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(`${'='.repeat(40)}\n`)

if (failed > 0) process.exit(1)
