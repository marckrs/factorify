// ============================================================
// Vercel MCP — Typed wrapper
// ============================================================

import type { MCPDeployResult } from './types.js'

export interface VercelConfig {
  token:       string
  org_id:      string
  project_id?: string
}

export class VercelMCP {
  private config: VercelConfig
  private baseUrl = 'https://api.vercel.com'

  constructor(config: VercelConfig) {
    this.config = config
  }

  async deploy(params: {
    project_id?: string
    env?:        Record<string, string>
    prod?:       boolean
  }): Promise<MCPDeployResult> {
    const projectId = params.project_id ?? this.config.project_id
    if (!projectId) throw new Error('VercelMCP: project_id required')

    const t0 = Date.now()
    const res = await fetch(`${this.baseUrl}/v13/deployments`, {
      method:  'POST',
      headers: this.headers(),
      body:    JSON.stringify({
        name:   projectId,
        target: params.prod ? 'production' : 'preview',
        env:    params.env ?? {},
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Vercel deploy failed: ${res.status} ${err}`)
    }

    const data = await res.json() as { id: string; url: string }

    const deployUrl = await this.pollReady(data.id, 120)
    const healthy   = await this.healthCheck(`https://${deployUrl}/health`)

    return {
      url:       `https://${deployUrl}`,
      deploy_id: data.id,
      build_ms:  Date.now() - t0,
      healthy,
    }
  }

  async getDeployment(deployId: string): Promise<{
    state:  string
    url:    string
    error?: string
  }> {
    const res = await fetch(
      `${this.baseUrl}/v13/deployments/${deployId}`,
      { headers: this.headers() }
    )
    const data = await res.json() as {
      readyState: string
      url:        string
      errorCode?: string
    }
    return { state: data.readyState, url: data.url, error: data.errorCode }
  }

  private async pollReady(deployId: string, timeoutSec: number): Promise<string> {
    const deadline = Date.now() + timeoutSec * 1000
    while (Date.now() < deadline) {
      const { state, url } = await this.getDeployment(deployId)
      if (state === 'READY') return url
      if (state === 'ERROR') throw new Error(`Deployment failed: ${deployId}`)
      await new Promise(r => setTimeout(r, 3000))
    }
    throw new Error(`Deployment timeout after ${timeoutSec}s: ${deployId}`)
  }

  private async healthCheck(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      return res.ok
    } catch {
      return false
    }
  }

  private headers(): Record<string, string> {
    return {
      Authorization:  `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      'X-Team-Id':    this.config.org_id,
    }
  }
}
