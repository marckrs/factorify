#!/usr/bin/env node
// ============================================================
// Sync files to Claude Projects Knowledge Base
// Uses internal Claude.ai API — experimental
//
// STATUS: BLOCKED by Cloudflare challenge on claude.ai/api
// Server-side requests (curl/node) get a JS challenge page.
// This script will work when Anthropic releases an official
// Projects API or if Cloudflare protection is relaxed.
//
// FALLBACK: manual upload via claude.ai web UI
// ============================================================

import { readFileSync } from 'fs'
import { resolve }      from 'path'

const SESSION_KEY  = process.env.CLAUDE_SESSION_KEY
const PROJECT_ID   = process.env.CLAUDE_PROJECT_ID
const ORG_ID       = process.env.CLAUDE_ORG_ID ?? ''
const BASE_URL     = 'https://claude.ai/api'
const REPO_ROOT    = process.cwd()

if (!SESSION_KEY || !PROJECT_ID) {
  console.error('CLAUDE_SESSION_KEY and CLAUDE_PROJECT_ID are required')
  process.exit(1)
}

// ── Files to sync (relative to repo root) ────────────────────
const FILES_TO_SYNC = [
  'COMPANY.md',
  'CLAUDE.md',
  'agents/orchestrator/spec.md',
  'agents/dev/code/spec.md',
  'agents/dev/test/spec.md',
  'agents/dev/review/spec.md',
  'agents/ops/deploy/spec.md',
  'agents/ops/monitor/spec.md',
  'agents/ops/incident/spec.md',
  'agents/biz/gtm/spec.md',
  'agents/biz/analytics/spec.md',
  'agents/biz/support/spec.md',
  'packages/attnres-memory/src/core/types.ts',
  'packages/orchestrator/src/core/types.ts',
  'packages/attnres-memory/schemas/supabase.sql',
]

// ── API helpers ───────────────────────────────────────────────
function makeHeaders() {
  return {
    'Content-Type': 'application/json',
    'Cookie':       `sessionKey=${SESSION_KEY}`,
  }
}

async function getOrgId() {
  if (ORG_ID) return ORG_ID
  const res = await fetch(`${BASE_URL}/organizations`, {
    headers: makeHeaders(),
  })
  if (!res.ok) throw new Error(`Get orgs failed: ${res.status}`)
  const orgs = await res.json()
  if (Array.isArray(orgs) && orgs.length > 0) return orgs[0].uuid
  throw new Error('No organizations found')
}

async function listDocs(orgId) {
  const res = await fetch(
    `${BASE_URL}/organizations/${orgId}/projects/${PROJECT_ID}/docs`,
    { headers: makeHeaders() }
  )
  if (!res.ok) throw new Error(`List docs failed: ${res.status}`)
  return res.json()
}

async function createDoc(orgId, filename, content) {
  const res = await fetch(
    `${BASE_URL}/organizations/${orgId}/projects/${PROJECT_ID}/docs`,
    {
      method:  'POST',
      headers: makeHeaders(),
      body: JSON.stringify({ file_name: filename, content }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Create doc failed: ${res.status} ${err}`)
  }
  return res.json()
}

async function updateDoc(orgId, docUuid, filename, content) {
  const res = await fetch(
    `${BASE_URL}/organizations/${orgId}/projects/${PROJECT_ID}/docs/${docUuid}`,
    {
      method:  'PUT',
      headers: makeHeaders(),
      body: JSON.stringify({ file_name: filename, content }),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Update doc failed: ${res.status} ${err}`)
  }
  return res.json()
}

// ── Main sync logic ───────────────────────────────────────────
async function sync() {
  console.log('Syncing files to Claude Projects Knowledge Base...\n')

  const orgId = await getOrgId()
  console.log(`Org: ${orgId}\n`)

  // 1. Get current docs in the project
  const existing = await listDocs(orgId)
  const docs = Array.isArray(existing) ? existing : (existing.docs ?? existing)
  const existingMap = new Map()
  for (const d of docs) {
    existingMap.set(d.file_name, d)
  }

  console.log(`Found ${existingMap.size} existing docs in project\n`)

  let created = 0, updated = 0, skipped = 0, errors = 0

  // 2. Sync each file
  for (const relPath of FILES_TO_SYNC) {
    const absPath  = resolve(REPO_ROOT, relPath)
    const filename = relPath.replace(/\//g, '__')

    let content
    try {
      content = readFileSync(absPath, 'utf-8')
    } catch {
      console.log(`  SKIP (not found): ${relPath}`)
      skipped++
      continue
    }

    try {
      const existingDoc = existingMap.get(filename)

      if (existingDoc) {
        if (existingDoc.content === content) {
          console.log(`  UNCHANGED: ${relPath}`)
          skipped++
        } else {
          await updateDoc(orgId, existingDoc.uuid, filename, content)
          console.log(`  UPDATED: ${relPath}`)
          updated++
        }
      } else {
        await createDoc(orgId, filename, content)
        console.log(`  CREATED: ${relPath}`)
        created++
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.error(`  ERROR syncing ${relPath}: ${err.message}`)
      errors++
    }
  }

  console.log(`
Sync complete:
  Created:  ${created}
  Updated:  ${updated}
  Skipped:  ${skipped}
  Errors:   ${errors}
`)

  if (errors > 0) process.exit(1)
}

sync().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
