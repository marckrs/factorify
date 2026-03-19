// API smoke tests — run with: npx tsx tests/api.test.ts

const BASE = 'http://localhost:3001'

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`OK ${name}`)
  } catch (err) {
    console.log(`FAIL ${name}: ${(err as Error).message}`)
  }
}

async function main() {
  console.log('\nFactorify API — Smoke Tests\n')

  await test('GET /health returns 200', async () => {
    const r = await fetch(`${BASE}/health`)
    if (!r.ok) throw new Error(`Status ${r.status}`)
    const body = await r.json() as { status: string }
    if (body.status !== 'ok') throw new Error('Expected status: ok')
  })

  await test('POST /tasks returns 202 with task_id', async () => {
    const r = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'Build a simple hello world TypeScript function' }),
    })
    if (r.status !== 202) throw new Error(`Status ${r.status}`)
    const body = await r.json() as { task_id: string; status: string }
    if (!body.task_id) throw new Error('Missing task_id')
    if (body.status !== 'queued') throw new Error(`Expected queued, got ${body.status}`)
  })

  await test('POST /tasks rejects short task description', async () => {
    const r = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'short' }),
    })
    if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`)
  })

  await test('GET /tasks returns list', async () => {
    const r = await fetch(`${BASE}/tasks`)
    if (!r.ok) throw new Error(`Status ${r.status}`)
    const body = await r.json() as { tasks: unknown[] }
    if (!Array.isArray(body.tasks)) throw new Error('Expected tasks array')
  })

  console.log()
}

main()
