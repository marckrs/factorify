# CLAUDE.md — Constituição do Sistema
# Autonomous SaaS Factory | Marcelo Lermen | v1.0.0

## Identidade do Sistema
Este é um monorepo de uma SaaS Factory autônoma. Múltiplos agentes especializados
colaboram para desenvolver, testar, revisar, fazer deploy e operar produtos SaaS.

## Stack Global
- TypeScript strict mode (SEMPRE — sem any implícito)
- Node.js 22, pnpm workspaces
- Supabase (Postgres + pgvector) para banco de dados
- Vercel para deploy de frontend e edge functions
- GitHub Actions para CI/CD

## Regras Absolutas de Código
1. TypeScript strict em TODOS os arquivos — sem exceção
2. Funções sempre versionadas: nomeFuncaoV2, V3 — nunca sobrescrever versão estável
3. Secrets SEMPRE via variáveis de ambiente — nunca hardcoded
4. Toda chamada de banco via Supabase MCP — nunca SQL direto
5. Logs estruturados (JSON) — nunca console.log em produção
6. Testes obrigatórios para código que vai a produção (mínimo 80% cobertura)
7. RLS (Row Level Security) ativo em TODAS as tabelas Supabase

## Estrutura do Monorepo
- packages/  → libs compartilhadas (@factory/*)
- agents/    → specs e lógica dos agentes
- apps/      → produtos SaaS (cada um com CLAUDE.md próprio)
- infra/     → GitHub Actions, Docker, configurações de infra
- config/    → configurações base (tsconfig, eslint, templates)

## Lei de Importação
apps/ e agents/ importam de packages/ — NUNCA entre si

## Aprovação Humana Obrigatória
- Deploy em produção com usuários reais
- Gastos de infra acima de R$ 500/mês
- Mudanças na arquitetura de segurança ou dados pessoais
- Contratos ou compromissos com terceiros

## Entregáveis
- Sempre completos e prontos para uso — nunca fragmentados
- Intros e encerramentos em português
- Código em inglês, comentários podem ser em português

## Contexto Adicional
Leia COMPANY.md para contexto estratégico completo da empresa.
