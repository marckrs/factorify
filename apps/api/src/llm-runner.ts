// ============================================================
// LLM Agent Runner
// ============================================================
// Replaces the simulated AgentRunner with real Claude API calls.
// Each subtask is sent to Claude with agent-specific system prompts.
// Tracks token usage per subtask for cost estimation (ADR-007).
// ============================================================

import Anthropic from '@anthropic-ai/sdk'
import type { SubTask, AgentSpec, TaskResult } from '@factory/orchestrator'

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  'code-smith': `You are the Code Agent of the Factorify platform.
Your role: write, refactor, and fix TypeScript/Python code.
Rules:
- TypeScript strict mode always — no implicit any
- Functions must be versioned (V2, V3) — never overwrite stable versions
- Secrets always via environment variables
- Structured JSON logs — never console.log in production
Return complete, ready-to-use code files with file paths.`,

  'test-engineer': `You are the Test Agent of the Factorify platform.
Your role: write automated tests for code produced by the code agent.
Rules:
- Minimum 80% coverage
- Always include: happy path, edge cases, error cases
- Use Vitest for TypeScript, pytest for Python
- Tests must be deterministic — no execution order dependency
- Descriptive English test names: "should return null when token is expired"
Return complete test files with file paths and execution commands.`,

  'review-guard': `You are the Review Agent of the Factorify platform.
Your role: review code for correctness, security, performance, and ADR compliance.
Checklist:
- TypeScript strict, no implicit any
- No hardcoded secrets
- No SQL injection
- RLS active on all Supabase tables
- Structured JSON logs
- Functions versioned, not overwritten
Return: verdict (APPROVED/APPROVED_WITH_CAVEATS/REJECTED), issues list with severity, fix suggestions.`,

  'infra-pilot': `You are the Deploy Agent of the Factorify platform.
Your role: plan and execute safe deployments via Vercel.
Rules:
- Staging: autonomous. Production: always requires human approval.
- Health check after every deploy
- Rollback plan must exist before any production deploy
Return: deployment plan with steps, environment config, and rollback procedure.`,

  'biz-analyst': `You are the GTM/Analytics Agent of the Factorify platform.
Your role: analyze metrics, track OKRs, and produce actionable reports.
Rules:
- Language accessible to non-developers
- Always contextualize numbers with comparisons
- Never omit negative metrics — full transparency
Return: executive summary, metrics with trends, and one high-priority actionable insight.`,
}

const DEFAULT_SYSTEM_PROMPT = `You are a specialized agent of the Factorify platform.
Execute the assigned task thoroughly and return complete, actionable output.
Use TypeScript strict mode. Follow all security and quality standards.`

// Pricing: Sonnet (input=$3/MTok, cache_read=$0.30/MTok, cache_write=$3.75/MTok, output=$15/MTok)
const PRICE_INPUT       = 3    / 1_000_000
const PRICE_CACHE_READ  = 0.30 / 1_000_000
const PRICE_CACHE_WRITE = 3.75 / 1_000_000
const PRICE_OUTPUT      = 15   / 1_000_000

export interface SubtaskTokenUsage {
  input_tokens:   number
  output_tokens:  number
  cache_write:    number
  cache_read:     number
  cost_usd:       number
}

export class LlmAgentRunner {
  private readonly client: Anthropic
  private readonly model: string

  // Token tracking per subtask — read by executor after orchestrator.execute()
  private readonly tokenMap = new Map<string, SubtaskTokenUsage>()

  constructor(options: {
    apiKey: string
    model?: string
  }) {
    this.client = new Anthropic({ apiKey: options.apiKey })
    this.model = options.model ?? 'claude-sonnet-4-20250514'
  }

  // Get token usage for a specific subtask
  getTokenUsage(subtaskId: string): SubtaskTokenUsage | undefined {
    return this.tokenMap.get(subtaskId)
  }

  // Get aggregated token usage across all tracked subtasks
  getTotalTokenUsage(): {
    total_tokens: number
    total_cost_usd: number
    cache_write: number
    cache_read: number
  } {
    let totalTokens = 0
    let totalCost = 0
    let cacheWrite = 0
    let cacheRead = 0
    for (const u of this.tokenMap.values()) {
      totalTokens += u.input_tokens + u.output_tokens
      totalCost   += u.cost_usd
      cacheWrite  += u.cache_write
      cacheRead   += u.cache_read
    }
    return { total_tokens: totalTokens, total_cost_usd: totalCost, cache_write: cacheWrite, cache_read: cacheRead }
  }

  // Clear tracking for a new task execution
  clearTokenTracking(): void {
    this.tokenMap.clear()
  }

  async run(subtask: SubTask, agent: AgentSpec): Promise<TaskResult> {
    const startTime = performance.now()

    try {
      const systemPrompt = AGENT_SYSTEM_PROMPTS[agent.name] ?? DEFAULT_SYSTEM_PROMPT

      const userMessage = [
        `## Task`,
        subtask.description,
        ``,
        `## Context`,
        `- Type: ${subtask.type}`,
        `- Priority: ${subtask.priority}`,
        `- Agent: ${agent.name} (${agent.capabilities.join(', ')})`,
        `- Parent task ID: ${subtask.parent_id}`,
        ``,
        `## Instructions`,
        `Execute this task completely. Return production-ready output.`,
        `If writing code, include complete file contents with paths.`,
        `If reviewing, include verdict and detailed issue list.`,
      ].join('\n')

      // Use cache_control on static system prompt blocks (ADR-007)
      const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
        {
          type:          'text',
          text:          systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ]

      const response = await this.client.messages.create({
        model:      this.model,
        max_tokens: 4096,
        system:     systemBlocks,
        messages:   [{ role: 'user', content: userMessage }],
      })

      const output = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n')

      const duration_ms = Math.round(performance.now() - startTime)

      // Extract token usage
      const usage = response.usage as Record<string, number>
      const inputTokens  = usage.input_tokens  ?? 0
      const outputTokens = usage.output_tokens  ?? 0
      const cacheWrite   = usage.cache_creation_input_tokens ?? 0
      const cacheRead    = usage.cache_read_input_tokens ?? 0

      // Compute cost: non-cached input + cache reads + cache writes + output
      const nonCachedInput = inputTokens - cacheRead
      const costUsd =
        (nonCachedInput * PRICE_INPUT) +
        (cacheRead      * PRICE_CACHE_READ) +
        (cacheWrite     * PRICE_CACHE_WRITE) +
        (outputTokens   * PRICE_OUTPUT)

      // Store in tracking map
      this.tokenMap.set(subtask.id, {
        input_tokens:  inputTokens,
        output_tokens: outputTokens,
        cache_write:   cacheWrite,
        cache_read:    cacheRead,
        cost_usd:      costUsd,
      })

      console.log(JSON.stringify({
        level:        'info',
        event:        'llm_call',
        agent:        agent.name,
        subtask_id:   subtask.id,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_write:  cacheWrite,
        cache_read:   cacheRead,
        cost_usd:     Math.round(costUsd * 10000) / 10000,
        duration_ms,
      }))

      return {
        task_id:     subtask.id,
        status:      'completed',
        output,
        duration_ms,
      }
    } catch (err) {
      const duration_ms = Math.round(performance.now() - startTime)
      const message = err instanceof Error ? err.message : String(err)

      return {
        task_id:     subtask.id,
        status:      'failed',
        error:       message,
        duration_ms,
      }
    }
  }
}
