// ============================================================
// LearningLayer — Reflexion + AttnRes
// ============================================================
// Analyzes subtask results and extracts structured learnings
// that are persisted in AttnRes as relevant/foundational memory.
//
// Inspired by Reflexion (Shinn et al., 2023) but with long-term
// persistence via AttnRes instead of short-term sliding window.
// ============================================================

import { randomUUID } from 'node:crypto'
import type { StorageAdapter, MemoryBlock } from '../core/types.js'
import type { Learning, LearningAnalysis, LearningCategory } from './types.js'

// Minimal interface for what we need from the Anthropic client
interface LLMClient {
  messages: {
    create(params: {
      model:      string
      max_tokens: number
      system:     string
      messages:   Array<{ role: string; content: string }>
    }): Promise<{
      content: Array<{ type: string; text?: string }>
    }>
  }
}

// Minimal subtask info needed for analysis
export interface SubtaskInfo {
  id:          string
  description: string
  type:        string
  agent:       string
  priority:    string
}

// Minimal result info needed for analysis
export interface SubtaskResult {
  task_id:      string
  status:       string
  output?:      string
  error?:       string
  duration_ms:  number
  success:      boolean
}

const REFLEXION_SYSTEM = `You are a learning system for an autonomous AI platform.
Your job is to analyze agent task executions and extract structured learnings.

When a task FAILS: extract what went wrong, why, and how to avoid it next time.
When a task SUCCEEDS but is unusually slow (>2min): extract optimization insights.
When neither: respond with has_learning: false.

Always respond with valid JSON only. No preamble. No markdown fences.

Schema:
{
  "has_learning": boolean,
  "summary": "one sentence summary",
  "learnings": [
    {
      "category": "error_pattern" | "success_pattern" | "tool_usage" | "architecture" | "agent_limitation" | "cost_optimization",
      "title": "short title ~10 words",
      "description": "complete actionable learning — what to do differently next time",
      "evidence": "exact quote from output/error that proves this learning"
    }
  ]
}`

export class LearningLayer {
  private client:  LLMClient
  private adapter: StorageAdapter
  private model:   string

  // Track occurrences for pattern detection
  private patternCounts = new Map<string, number>()

  constructor(
    client:  LLMClient,
    adapter: StorageAdapter,
    model    = 'claude-sonnet-4-20250514',
  ) {
    this.client  = client
    this.adapter = adapter
    this.model   = model
  }

  // ── Main entry point ─────────────────────────────────────
  async analyze(
    subtask:    SubtaskInfo,
    result:     SubtaskResult,
    sessionId:  string,
  ): Promise<LearningAnalysis> {
    const isFailed = !result.success
    const isSlow   = result.duration_ms > 120_000
    const hasError = !!result.error

    if (!isFailed && !isSlow && !hasError) {
      return { has_learning: false, learnings: [], summary: '' }
    }

    try {
      const analysis = await this.callReflexion(subtask, result)

      if (!analysis.has_learning || analysis.learnings.length === 0) {
        return { has_learning: false, learnings: [], summary: '' }
      }

      const stored: Learning[] = []
      for (const raw of analysis.learnings) {
        const learning = await this.storeLearning(raw, subtask, result, sessionId)
        stored.push(learning)
      }

      return { ...analysis, learnings: stored }
    } catch {
      // LearningLayer must never crash the main pipeline
      return { has_learning: false, learnings: [], summary: '' }
    }
  }

  // ── Store a learning in AttnRes ───────────────────────────
  private async storeLearning(
    raw:        Partial<Learning>,
    subtask:    SubtaskInfo,
    result:     SubtaskResult,
    sessionId:  string,
  ): Promise<Learning> {
    const patternKey  = this.makePatternKey(subtask.agent, raw.title ?? '')
    const occurrences = (this.patternCounts.get(patternKey) ?? 0) + 1
    this.patternCounts.set(patternKey, occurrences)

    // Importance escalates with recurrence
    const importance = occurrences >= 3 ? 0.92
                     : occurrences >= 2 ? 0.80
                     : 0.72

    const now = new Date().toISOString()
    const learning: Learning = {
      id:          `learn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category:    (raw.category as LearningCategory) ?? 'error_pattern',
      agent:       subtask.agent,
      title:       raw.title       ?? 'Unknown learning',
      description: raw.description ?? '',
      context:     subtask.description.slice(0, 200),
      evidence:    raw.evidence    ?? result.error ?? '',
      importance,
      occurrences,
      created_at:  now,
      last_seen:   now,
    }

    // Format for AttnRes retrieval
    const content = [
      `[LEARNING — ${learning.category.toUpperCase()}]`,
      `Agent: ${learning.agent}`,
      `Title: ${learning.title}`,
      ``,
      learning.description,
      ``,
      `Evidence: ${learning.evidence.slice(0, 300)}`,
      `Occurrences: ${occurrences}`,
    ].join('\n')

    const block: MemoryBlock = {
      id:            randomUUID(),
      content,
      importance,
      block_type:    importance >= 0.90 ? 'foundational' : 'relevant',
      metadata:      {
        type:        'learning',
        category:    learning.category,
        pattern_key: patternKey,
        occurrences,
        session_id:  sessionId,
        learning_id: learning.id,
        agent:       subtask.agent,
      },
      created_at:    now,
      last_accessed: now,
      access_count:  0,
      decay_rate:    0.98, // learnings decay very slowly
    }

    await this.adapter.store(block)

    if (occurrences >= 3) {
      console.log(JSON.stringify({
        level:    'info',
        event:    'learning_promoted_to_foundational',
        agent:    subtask.agent,
        title:    learning.title,
        pattern:  patternKey,
        count:    occurrences,
      }))
    }

    return learning
  }

  // ── Reflexion call ────────────────────────────────────────
  private async callReflexion(
    subtask: SubtaskInfo,
    result:  SubtaskResult,
  ): Promise<LearningAnalysis> {
    const userMessage = [
      `Agent: ${subtask.agent}`,
      `Task: ${subtask.description}`,
      `Status: ${result.success ? 'SUCCESS' : 'FAILURE'}`,
      `Duration: ${(result.duration_ms / 1000).toFixed(1)}s`,
      result.error ? `Error: ${result.error}` : '',
      ``,
      `Output (first 1000 chars):`,
      (result.output ?? '').slice(0, 1000),
    ].filter(Boolean).join('\n')

    const response = await this.client.messages.create({
      model:      this.model,
      max_tokens: 1024,
      system:     REFLEXION_SYSTEM,
      messages:   [{ role: 'user', content: userMessage }],
    })

    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text ?? '')
      .join('')

    try {
      const clean = raw.replace(/```json\n?|```\n?/g, '').trim()
      return JSON.parse(clean) as LearningAnalysis
    } catch {
      return { has_learning: false, learnings: [], summary: '' }
    }
  }

  private makePatternKey(agent: string, title: string): string {
    return `${agent}::${title.toLowerCase().replace(/\s+/g, '_')}`.slice(0, 80)
  }
}
