// ============================================================
// LLM Agent Runner
// ============================================================
// Replaces the simulated AgentRunner with real Claude API calls.
// Each subtask is sent to Claude with agent-specific system prompts.
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

export class LlmAgentRunner {
  private readonly client: Anthropic
  private readonly model: string

  constructor(options: {
    apiKey: string
    model?: string
  }) {
    this.client = new Anthropic({ apiKey: options.apiKey })
    this.model = options.model ?? 'claude-sonnet-4-20250514'
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

      const response = await this.client.messages.create({
        model:      this.model,
        max_tokens: 4096,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userMessage }],
      })

      const output = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n')

      const duration_ms = Math.round(performance.now() - startTime)

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
