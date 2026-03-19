// ============================================================
// A2A Protocol — Agent-to-Agent Communication (ADR-010)
// ============================================================
// Direct communication channel between agents via Supabase.
// Bypasses orchestrator for multi-turn collaboration.
//
// Use cases:
//   code <-> review: iterate until approval (max 3 turns)
//   monitor -> incident: handoff alert with full context
//   analytics -> gtm: metrics briefing for strategy decisions
// ============================================================

export type MessageType = 'request' | 'response' | 'abort' | 'checkpoint'

export interface A2AMessage {
  id?:         string
  from_agent:  string
  to_agent:    string
  session_id:  string
  msg_type:    MessageType
  payload:     Record<string, unknown>
  replied?:    boolean
  created_at?: string
}

// Minimal Supabase interface to avoid hard dependency
interface SupabaseClient {
  from(table: string): {
    insert(data: Record<string, unknown>): {
      select(cols: string): {
        single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
      }
    }
    select(cols: string): {
      eq(col: string, val: string): {
        eq(col: string, val: string | boolean): {
          order(col: string, opts: { ascending: boolean }): {
            limit(n: number): {
              single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>
            }
          }
        }
      }
    }
    update(data: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: unknown }>
    }
  }
}

const TIMEOUT_MS = 120_000
const MAX_TURNS  = 3
const POLL_MS    = 2000

export class A2AChannel {
  private client:  SupabaseClient
  private agentId: string

  constructor(agentId: string, client: SupabaseClient) {
    this.agentId = agentId
    this.client  = client
  }

  async send(params: {
    to:         string
    session_id: string
    msg_type:   MessageType
    payload:    Record<string, unknown>
  }): Promise<string> {
    const { data, error } = await this.client
      .from('agent_messages')
      .insert({
        from_agent: this.agentId,
        to_agent:   params.to,
        session_id: params.session_id,
        msg_type:   params.msg_type,
        payload:    params.payload,
      })
      .select('id')
      .single()

    if (error) throw new Error(`A2A send failed: ${String(error)}`)
    return (data as { id: string }).id
  }

  async waitForResponse(
    sessionId:  string,
    timeoutMs = TIMEOUT_MS,
  ): Promise<A2AMessage | null> {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      const { data } = await this.client
        .from('agent_messages')
        .select('*')
        .eq('to_agent', this.agentId)
        .eq('session_id', sessionId)
        .eq('msg_type', 'response')
        .eq('replied', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        // Mark as read
        await this.client
          .from('agent_messages')
          .update({ replied: true })
          .eq('id', (data as { id: string }).id)

        return data as unknown as A2AMessage
      }

      await new Promise(r => setTimeout(r, POLL_MS))
    }

    return null // timeout
  }

  // High-level: code <-> review iteration loop
  async codeReviewLoop(params: {
    session_id:  string
    code_output: string
    task:        string
  }): Promise<{ approved: boolean; final_output: string; turns: number }> {
    let current = params.code_output
    let turns   = 0

    while (turns < MAX_TURNS) {
      turns++

      await this.send({
        to:         'review-guard',
        session_id: params.session_id,
        msg_type:   'request',
        payload:    { task: params.task, code: current, turn: turns },
      })

      const response = await this.waitForResponse(params.session_id)
      if (!response) break

      const result = response.payload as { approved?: boolean; output?: string }

      if (result.approved) {
        return { approved: true, final_output: current, turns }
      }

      if (result.output) {
        current = result.output
      }
    }

    return { approved: false, final_output: current, turns }
  }
}
