// ============================================================
// GitHub MCP — Typed wrapper
// ============================================================
// Provides a typed interface for GitHub operations.
// In production API context, uses GitHub REST API directly.
// ============================================================

import type { MCPFile, MCPCommitResult } from './types.js'

export interface GitHubConfig {
  owner:  string
  repo:   string
  token:  string
}

export class GitHubMCP {
  private config: GitHubConfig
  private baseUrl: string

  constructor(config: GitHubConfig) {
    this.config  = config
    this.baseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`
  }

  async upsertFile(
    file:    MCPFile,
    message: string,
    branch = 'main',
  ): Promise<MCPCommitResult> {
    const existing = await this.getFileSha(file.path, branch)

    const body: Record<string, unknown> = {
      message,
      content: Buffer.from(file.content).toString('base64'),
      branch,
    }
    if (existing) body.sha = existing

    const res = await fetch(`${this.baseUrl}/contents/${file.path}`, {
      method:  'PUT',
      headers: this.headers(),
      body:    JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`GitHub upsertFile failed: ${res.status} ${err}`)
    }

    const data = await res.json() as {
      commit: { sha: string; html_url: string }
    }

    return { sha: data.commit.sha, url: data.commit.html_url, branch }
  }

  async commitFiles(
    files:   MCPFile[],
    message: string,
    branch = 'main',
  ): Promise<MCPCommitResult> {
    // Get base tree SHA
    const refRes = await fetch(
      `${this.baseUrl}/git/refs/heads/${branch}`,
      { headers: this.headers() }
    )
    if (!refRes.ok) throw new Error(`Branch '${branch}' not found`)
    const refData = await refRes.json() as { object: { sha: string } }
    const baseSha = refData.object.sha

    const commitRes = await fetch(
      `${this.baseUrl}/git/commits/${baseSha}`,
      { headers: this.headers() }
    )
    const commitData = await commitRes.json() as { tree: { sha: string } }
    const baseTreeSha = commitData.tree.sha

    // Create blobs for each file
    const blobs = await Promise.all(files.map(async (file) => {
      const res = await fetch(`${this.baseUrl}/git/blobs`, {
        method:  'POST',
        headers: this.headers(),
        body:    JSON.stringify({ content: file.content, encoding: 'utf-8' }),
      })
      const data = await res.json() as { sha: string }
      return { path: file.path, mode: '100644' as const, type: 'blob' as const, sha: data.sha }
    }))

    // Create new tree
    const treeRes = await fetch(`${this.baseUrl}/git/trees`, {
      method:  'POST',
      headers: this.headers(),
      body:    JSON.stringify({ base_tree: baseTreeSha, tree: blobs }),
    })
    const treeData = await treeRes.json() as { sha: string }

    // Create commit
    const newCommitRes = await fetch(`${this.baseUrl}/git/commits`, {
      method:  'POST',
      headers: this.headers(),
      body:    JSON.stringify({ message, tree: treeData.sha, parents: [baseSha] }),
    })
    const newCommit = await newCommitRes.json() as { sha: string; html_url: string }

    // Update branch ref
    await fetch(`${this.baseUrl}/git/refs/heads/${branch}`, {
      method:  'PATCH',
      headers: this.headers(),
      body:    JSON.stringify({ sha: newCommit.sha }),
    })

    return { sha: newCommit.sha, url: newCommit.html_url, branch }
  }

  async readFile(path: string, branch = 'main'): Promise<string | null> {
    const res = await fetch(
      `${this.baseUrl}/contents/${path}?ref=${branch}`,
      { headers: this.headers() }
    )
    if (!res.ok) return null
    const data = await res.json() as { content: string }
    return Buffer.from(data.content, 'base64').toString('utf-8')
  }

  private async getFileSha(path: string, branch: string): Promise<string | null> {
    const res = await fetch(
      `${this.baseUrl}/contents/${path}?ref=${branch}`,
      { headers: this.headers() }
    )
    if (!res.ok) return null
    const data = await res.json() as { sha: string }
    return data.sha
  }

  private headers(): Record<string, string> {
    return {
      Authorization:  `Bearer ${this.config.token}`,
      Accept:         'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    }
  }
}
