// @factory/mcp-servers — Public API

export { GitHubMCP }  from './github.js'
export type { GitHubConfig } from './github.js'
export { VercelMCP }  from './vercel.js'
export type { VercelConfig } from './vercel.js'
export type { MCPFile, MCPCommitResult, MCPDeployResult, MCPQueryResult } from './types.js'
export { CodePostProcessor } from './code-post-processor.js'

import { GitHubMCP } from './github.js'
import { VercelMCP } from './vercel.js'

// Factory function — creates all MCP clients from env
export function createMCPClients() {
  const github = new GitHubMCP({
    owner: 'marckrs',
    repo:  'factorify',
    token: process.env.GITHUB_TOKEN ?? '',
  })

  const vercel = new VercelMCP({
    token:      process.env.VERCEL_TOKEN    ?? '',
    org_id:     process.env.VERCEL_ORG_ID   ?? '',
    project_id: process.env.VERCEL_PROJECT_ID,
  })

  return { github, vercel }
}
