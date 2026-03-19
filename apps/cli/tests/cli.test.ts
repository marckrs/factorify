// CLI smoke tests — validates command parsing (no API needed)

import { execSync } from 'node:child_process'

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

console.log('\nCLI — Command Parsing\n' + '-'.repeat(40))

test('--help shows usage', () => {
  const out = execSync('npx tsx src/index.ts --help', { cwd: process.cwd() }).toString()
  if (!out.includes('factorify')) throw new Error('Expected "factorify" in help')
  if (!out.includes('run'))       throw new Error('Expected "run" command in help')
  if (!out.includes('status'))    throw new Error('Expected "status" command in help')
  if (!out.includes('health'))    throw new Error('Expected "health" command in help')
})

test('--version shows version', () => {
  const out = execSync('npx tsx src/index.ts --version', { cwd: process.cwd() }).toString()
  if (!out.includes('0.1.0')) throw new Error('Expected version 0.1.0')
})

test('run --help shows options', () => {
  const out = execSync('npx tsx src/index.ts run --help', { cwd: process.cwd() }).toString()
  if (!out.includes('--priority'))  throw new Error('Expected --priority option')
  if (!out.includes('--dry-run'))   throw new Error('Expected --dry-run option')
  if (!out.includes('--wait'))      throw new Error('Expected --wait option')
})

console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(`${'='.repeat(40)}\n`)

if (failed > 0) process.exit(1)
