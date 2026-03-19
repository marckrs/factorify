// ============================================================
// MCP Servers — Shared Types
// ============================================================

export interface MCPFile {
  path:    string
  content: string
}

export interface MCPCommitResult {
  sha:     string
  url:     string
  branch:  string
}

export interface MCPDeployResult {
  url:         string
  deploy_id:   string
  build_ms:    number
  healthy:     boolean
}

export interface MCPQueryResult {
  rows:    Record<string, unknown>[]
  count:   number
  error?:  string
}
