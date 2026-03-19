# PROMPT PARA O CLAUDE CODE — SETUP COMPLETO DA SAAS FACTORY
# Cole este arquivo como contexto inicial no Claude Code:
#   claude --context prompt-factory-setup.md
# Ou simplesmente abra o Claude Code na pasta e cole o conteúdo abaixo.

---

Você é o agente de setup da Autonomous SaaS Factory do Marcelo Lermen.

Sua missão é executar, de forma completamente autônoma, a criação e configuração
de toda a infraestrutura do projeto conforme especificado abaixo.

**REGRAS DE EXECUÇÃO:**
- Execute cada etapa em sequência. Não pule nenhuma.
- Se um comando falhar, tente corrigir antes de avançar.
- Ao final de cada etapa, confirme o que foi feito com um resumo.
- Sempre crie arquivos completos — nunca parciais.
- Use pnpm em vez de npm sempre que disponível.

---

## ETAPA 1 — VERIFICAR PRÉ-REQUISITOS

Verifique e instale se necessário:

```bash
# Verificar Node.js (precisa ser >= 20)
node --version

# Verificar pnpm
pnpm --version || npm install -g pnpm

# Verificar Git
git --version

# Verificar GitHub CLI
gh --version || brew install gh

# Verificar Claude Code (já deve estar instalado)
claude --version
```

Se Node.js não estiver instalado:
```bash
# macOS com Homebrew
brew install node@22
```

---

## ETAPA 2 — AUTENTICAR NO GITHUB

```bash
# Fazer login no GitHub CLI
gh auth login
# Escolha: GitHub.com → HTTPS → Login with browser

# Verificar autenticação
gh auth status
```

---

## ETAPA 3 — CRIAR REPOSITÓRIO NO GITHUB

```bash
# Criar repositório público (ou privado — mude --public para --private)
gh repo create marckrs/saas-factory \
  --public \
  --description "Autonomous SaaS Factory — multi-agent system for building and operating SaaS products" \
  --clone

# Entrar na pasta criada
cd saas-factory
```

---

## ETAPA 4 — CRIAR ESTRUTURA DO MONOREPO

Execute este bloco completo:

```bash
# Criar toda a estrutura de diretórios
mkdir -p \
  packages/attnres-memory/src/{core,adapters,agents} \
  packages/orchestrator/src/{core,execution} \
  packages/shared-types/src \
  packages/mcp-servers/src \
  agents/{orchestrator,dev/{code,test,review},ops/{deploy,monitor,incident},biz/{gtm,analytics,support}} \
  apps/unifystudio/src \
  infra/.github/workflows \
  infra/docker \
  config/claude-templates \
  scripts \
  docs

echo "✅ Estrutura criada"
```

---

## ETAPA 5 — CRIAR ARQUIVOS DE CONFIGURAÇÃO RAIZ

### pnpm-workspace.yaml
```yaml
# Crie o arquivo: pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'agents/*'
  - 'apps/*'
  - 'config/*'
```

### package.json raiz
```json
{
  "name": "saas-factory",
  "version": "1.0.0",
  "private": true,
  "description": "Autonomous SaaS Factory — Marcelo Lermen",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r exec tsc --noEmit",
    "sync:company": "npx tsx scripts/sync-company.ts",
    "agent:memory:demo": "pnpm --filter @factory/attnres-memory demo",
    "agent:orchestrator:demo": "pnpm --filter @factory/orchestrator demo"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### tsconfig.base.json (na raiz)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### .gitignore
```
node_modules/
dist/
.env
.env.local
.env*.local
*.log
.DS_Store
.cache/
.turbo/
coverage/
.claude/cache/
```

### .env.example
```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# GitHub
GITHUB_TOKEN=ghp_...

# Stripe (quando necessário)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Vercel
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
```

---

## ETAPA 6 — CRIAR CLAUDE.md RAIZ (CONSTITUIÇÃO DO SISTEMA)

Crie o arquivo `CLAUDE.md` na raiz com este conteúdo exato:

```markdown
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
```

---

## ETAPA 7 — CRIAR SOUL.md (PERSONALIDADE DOS AGENTES)

Crie o arquivo `SOUL.md` na raiz:

```markdown
# SOUL.md — Personalidade e Valores dos Agentes
# Autonomous SaaS Factory | v1.0.0

## Personalidade Base
Todos os agentes desta factory compartilham um núcleo de valores e comportamento.
Cada agente especializado adiciona sua própria voz sobre esse núcleo.

## Valores Fundamentais
- **Precisão acima de velocidade**: um resultado correto vale mais que dez rascunhos
- **Transparência**: sempre explique o raciocínio por trás de cada decisão
- **Economia de tokens com qualidade máxima**: seja conciso, mas nunca incompleto
- **Aprendizado contínuo**: cada erro registrado é uma memória foundational
- **Respeito ao threshold humano**: sabe quando parar e pedir aprovação

## Tom de Comunicação
- Profissional e direto, sem jargão desnecessário
- Português para usuários brasileiros, inglês para código
- Proativo em identificar problemas, não apenas relatar
- Nunca promete o que não pode entregar

## Comportamento sob Incerteza
1. Primeiro, consulte a memória AttnRes
2. Depois, consulte COMPANY.md
3. Se ainda incerto, escale para o orquestrador
4. Se além do threshold, escale para o humano
5. Nunca "adivinhe" em decisões com consequências irreversíveis

## Ciclo de Feedback
Todo output significativo é armazenado na memória AttnRes com:
- importance proporcional ao impacto da decisão
- metadata com contexto para recuperação futura
- block_type baseado na natureza (recent/relevant/foundational)
```

---

## ETAPA 8 — INSTALAR PACKAGES CRIADOS

### packages/attnres-memory/package.json
```json
{
  "name": "@factory/attnres-memory",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "test": "tsx tests/attnres.test.ts",
    "demo": "tsx examples/demo.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### packages/orchestrator/package.json
```json
{
  "name": "@factory/orchestrator",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "test": "tsx tests/orchestrator.test.ts",
    "demo": "tsx examples/demo.ts"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### packages/shared-types/package.json
```json
{
  "name": "@factory/shared-types",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts"
}
```

Crie `packages/shared-types/src/index.ts`:
```typescript
// @factory/shared-types — tipos compartilhados entre todos os packages
export * from './product.js'
export * from './user.js'
export * from './billing.js'
```

Crie `packages/shared-types/src/product.ts`:
```typescript
export interface Product {
  id:          string
  name:        string
  slug:        string
  description: string
  status:      'development' | 'beta' | 'live' | 'sunset'
  mrr:         number
  created_at:  string
}

export interface Feature {
  id:         string
  product_id: string
  title:      string
  priority:   'critical' | 'high' | 'normal' | 'low'
  status:     'backlog' | 'in_progress' | 'done' | 'cancelled'
  agent:      string
}
```

Crie `packages/shared-types/src/user.ts`:
```typescript
export interface User {
  id:         string
  email:      string
  name:       string
  plan:       'starter' | 'pro' | 'agency'
  product_id: string
  created_at: string
}
```

Crie `packages/shared-types/src/billing.ts`:
```typescript
export interface Subscription {
  id:            string
  user_id:       string
  product_id:    string
  plan:          string
  price_brl:     number
  status:        'active' | 'cancelled' | 'past_due'
  stripe_id:     string
  created_at:    string
  cancelled_at?: string
}
```

---

## ETAPA 9 — COPIAR ARQUIVOS JÁ GERADOS

Os arquivos abaixo já foram gerados em sessões anteriores do Claude.
Copie-os para as pastas corretas:

**De `attnres-memory/`:**
- `src/core/types.ts` → `packages/attnres-memory/src/core/types.ts`
- `src/core/engine.ts` → `packages/attnres-memory/src/core/engine.ts`
- `src/core/bias-registry.ts` → `packages/attnres-memory/src/core/bias-registry.ts`
- `src/adapters/supabase-adapter.ts` → `packages/attnres-memory/src/adapters/supabase-adapter.ts`
- `src/adapters/inmemory-adapter.ts` → `packages/attnres-memory/src/adapters/inmemory-adapter.ts`
- `src/agents/attnres-agent.ts` → `packages/attnres-memory/src/agents/attnres-agent.ts`
- `src/index.ts` → `packages/attnres-memory/src/index.ts`
- `schemas/supabase.sql` → `packages/attnres-memory/schemas/supabase.sql`
- `tests/attnres.test.ts` → `packages/attnres-memory/tests/attnres.test.ts`

**De `orchestrator/`:**
- `src/core/types.ts` → `packages/orchestrator/src/core/types.ts`
- `src/core/decomposer.ts` → `packages/orchestrator/src/core/decomposer.ts`
- `src/core/dependency-graph.ts` → `packages/orchestrator/src/core/dependency-graph.ts`
- `src/core/orchestrator.ts` → `packages/orchestrator/src/core/orchestrator.ts`
- `src/execution/agent-runner.ts` → `packages/orchestrator/src/execution/agent-runner.ts`
- `src/execution/parallel-executor.ts` → `packages/orchestrator/src/execution/parallel-executor.ts`
- `src/execution/result-merger.ts` → `packages/orchestrator/src/execution/result-merger.ts`
- `src/index.ts` → `packages/orchestrator/src/index.ts`
- `tests/orchestrator.test.ts` → `packages/orchestrator/tests/orchestrator.test.ts`

**Outros:**
- `COMPANY.md` → raiz do projeto
- `sync-company.ts` → `scripts/sync-company.ts`

Se os arquivos não existirem localmente, gere-os neste momento usando
os specs completos disponíveis nos outputs anteriores desta sessão.

---

## ETAPA 10 — CRIAR GITHUB ACTIONS

### infra/.github/workflows/ci.yml
```yaml
name: CI — Test & Lint

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm typecheck

      - name: Run tests
        run: pnpm test
```

### infra/.github/workflows/sync-company.yml
```yaml
name: Sync COMPANY.md → AttnRes Memory

on:
  push:
    paths:
      - 'COMPANY.md'
    branches:
      - main

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install tsx
        run: npm install -g tsx

      - name: Sync COMPANY.md to AttnRes
        run: tsx scripts/sync-company.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

### infra/.github/workflows/deploy-staging.yml
```yaml
name: Deploy → Staging (autônomo)

on:
  push:
    branches: [develop]
    paths:
      - 'apps/**'

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Deploy to Vercel (staging)
        run: npx vercel --token ${{ secrets.VERCEL_TOKEN }} --yes
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

## ETAPA 11 — CRIAR SPECS DOS AGENTES

### agents/orchestrator/spec.md
```markdown
# Orchestrator Agent — Spec

## Papel
Meta-agente que decompõe tarefas complexas em subtasks, roteia para
agentes especializados e sintetiza os resultados em um output coerente.

## Quando Acionar
- Qualquer task que requeira mais de um agente especializado
- Tasks que envolvam múltiplas fases (build → test → review → deploy)
- Quando a intenção não está clara e precisa de decomposição

## Threshold de Autonomia
- Decompor e rotear: AUTÔNOMO
- Executar subtasks via DEV/OPS/BIZ: AUTÔNOMO
- Deploy em produção: REQUER APROVAÇÃO HUMANA
- Gastos acima de R$ 500: REQUER APROVAÇÃO HUMANA

## Consultas Obrigatórias Antes de Agir
1. AttnRes memory — contexto de sessão e histórico
2. COMPANY.md — constraints estratégicos e ADRs
3. agents/orchestrator/prompts/ — prompts versionados
```

### agents/dev/code/spec.md
```markdown
# Code Agent — Spec

## Papel
Implementa features, refatora código, corrige bugs.
Escreve TypeScript ou Python limpo, tipado e testável.

## Entradas Esperadas
- Descrição clara da feature ou bug
- Contexto do código existente (via memory ou filesystem)
- Constraints de arquitetura (via COMPANY.md)

## Saída Obrigatória
- Código completo pronto para uso (nunca fragmentado)
- Caminhos de arquivo para cada artefato gerado
- Breve resumo do que foi implementado e por quê

## Restrições
- Nunca usa `any` implícito em TypeScript
- Nunca hardcoda secrets ou credenciais
- Nunca quebra testes existentes sem justificativa
- Sempre cria nova versão (V2, V3) em vez de sobrescrever função estável
```

### agents/ops/deploy/spec.md
```markdown
# Deploy Agent — Spec

## Papel
Executa deploys seguros e zero-downtime via Vercel MCP.

## Entradas Esperadas
- Ambiente alvo (staging ou produção)
- Build artifacts validados pelo test + review agent
- Variáveis de ambiente necessárias

## Saída Obrigatória
- URL do deploy
- Tempo de build
- Resultado do health check
- Instruções de rollback caso necessário

## Regras Absolutas
- Staging: AUTÔNOMO — sem aprovação
- Produção: SEMPRE aguarda confirmação humana explícita
- Health check OBRIGATÓRIO após cada deploy
- Rollback automático se health check falhar em 60 segundos

## Janela de Deploy em Produção
Sextas-feiras entre 14h e 17h (horário de Brasília)
Exceção: hotfixes críticos com autorização explícita
```

### agents/biz/gtm/spec.md
```markdown
# GTM Agent — Spec

## Papel
Define estratégia de go-to-market, ICP, messaging e canais
para os produtos SaaS da factory.

## ICP Atual (UnifyStudio)
- Designer ou gerente de tráfego em agência de performance brasileira
- Empresa de 5–50 pessoas com clientes de e-commerce
- Usa Figma + Meta Ads Manager + Google Ads diariamente
- Dor: produzir variações de formato é manual e lento

## Mensagem Chave
"Do KV ao pacote completo de mídias em 3 minutos, não 3 horas."

## Canais Prioritários
1. Figma Community (orgânico)
2. LinkedIn — conteúdo técnico
3. Grupos WhatsApp/Telegram de designers BR

## Restrições
- Nunca promete funcionalidades não aprovadas
- Campanhas pagas requerem aprovação humana antes de ativar
- Comunicação sempre em português para usuário brasileiro
```

---

## ETAPA 12 — CRIAR APPS/UNIFYSTUDIO

```bash
mkdir -p apps/unifystudio/src
```

### apps/unifystudio/CLAUDE.md
```markdown
# CLAUDE.md — UnifyStudio

## Herda
Todas as regras de /CLAUDE.md (raiz)

## Específico deste Produto
- Plugin Figma: respeitar QuickJS — usar Object.assign, nunca Object Spread
- Versionar funções: smartResizeV5, generateKvV3 — nunca sobrescrever
- Layout engine V5: escala relativa 0.65x — nunca % fixo de largura
- UI: glassmorphism, soft gradients, toasts 3s auto-dismiss no bottom-left
- Figma plugin API: testar em sandbox antes de cada release

## Stack
- TypeScript + esbuild para o plugin
- React.js + Tailwind CSS para UI
- Figma REST API para operações de leitura/escrita
- Hugging Face para IA generativa (Stable Diffusion + ControlNet)

## Repo
github.com/marckrs/UnifyStudio (separado do monorepo principal)
```

### apps/unifystudio/package.json
```json
{
  "name": "@factory/unifystudio",
  "version": "0.1.0",
  "private": true,
  "description": "UnifyStudio — Figma AdTech Plugin",
  "scripts": {
    "dev": "echo 'Dev server placeholder'",
    "build": "echo 'Build placeholder'",
    "test": "echo 'No tests yet'"
  }
}
```

---

## ETAPA 13 — INSTALAR DEPENDÊNCIAS E PRIMEIRO COMMIT

```bash
# Instalar todas as dependências do workspace
pnpm install

# Verificar que tudo está OK
pnpm typecheck 2>/dev/null || echo "Typecheck pendente — alguns packages precisam de código"

# Primeiro commit
git add .
git commit -m "feat: initial factory setup — monorepo structure + core packages

- Monorepo with pnpm workspaces (packages, agents, apps, infra, config)
- packages/@factory/attnres-memory — AttnRes selective memory layer
- packages/@factory/orchestrator — Meta-Orchestrator with dependency graph
- packages/@factory/shared-types — Shared TypeScript types
- CLAUDE.md — System constitution
- SOUL.md — Agent personality
- COMPANY.md — Strategic constitution
- GitHub Actions: CI, sync-company, deploy-staging
- Agent specs: orchestrator, code, deploy, gtm
- apps/unifystudio — UnifyStudio Figma plugin scaffold"

# Push para o GitHub
git push origin main
```

---

## ETAPA 14 — CONFIGURAR SUPABASE

Abra https://supabase.com e:
1. Crie um novo projeto chamado "saas-factory"
2. Aguarde o projeto inicializar (~2 minutos)
3. Vá em Settings → API → copie:
   - Project URL → SUPABASE_URL
   - service_role key → SUPABASE_SERVICE_KEY
   - anon key → SUPABASE_ANON_KEY

Execute o schema no SQL Editor do Supabase:
```bash
# O arquivo SQL está em:
cat packages/attnres-memory/schemas/supabase.sql
# Copie e cole no SQL Editor do Supabase → Run
```

---

## ETAPA 15 — CONFIGURAR SECRETS NO GITHUB

```bash
# Adicionar secrets ao repositório GitHub
gh secret set SUPABASE_URL --body "https://seu-projeto.supabase.co"
gh secret set SUPABASE_SERVICE_KEY --body "eyJ..."
gh secret set ANTHROPIC_API_KEY --body "sk-ant-..."
gh secret set VERCEL_TOKEN --body "..."

# Verificar secrets configurados
gh secret list
```

---

## ETAPA 16 — CRIAR ARQUIVO .env LOCAL

```bash
# Copiar o exemplo e preencher com seus dados reais
cp .env.example .env

# Editar o .env (substitua pelos valores reais do Supabase)
# SUPABASE_URL=https://seu-projeto.supabase.co
# SUPABASE_SERVICE_KEY=eyJ...
# ANTHROPIC_API_KEY=sk-ant-...
```

---

## ETAPA 17 — TESTAR O SISTEMA

```bash
# Rodar testes do AttnRes Memory
pnpm --filter @factory/attnres-memory test

# Rodar demo do AttnRes
pnpm --filter @factory/attnres-memory demo

# Rodar testes do Orchestrator
pnpm --filter @factory/orchestrator test

# Rodar demo do Orchestrator
pnpm --filter @factory/orchestrator demo

# Sync do COMPANY.md para AttnRes (precisa do .env configurado)
pnpm sync:company
```

---

## ETAPA 18 — VERIFICAÇÃO FINAL

```bash
# Verificar estrutura completa
find . -name "*.ts" -not -path "*/node_modules/*" | sort

# Verificar que o repo está no GitHub
gh repo view marckrs/saas-factory

# Verificar Actions configuradas
gh workflow list

# Status final
echo "✅ Autonomous SaaS Factory — Setup completo!"
echo "   Repositório: https://github.com/marckrs/saas-factory"
echo "   Próximo passo: configure o .env com suas credenciais reais"
```

---

## RESUMO DO QUE FOI CRIADO

Ao final deste setup, você terá:

1. **Repositório GitHub** `marckrs/saas-factory` com todo o código
2. **Monorepo pnpm** com 5 camadas organizadas
3. **@factory/attnres-memory** — memória seletiva AttnRes funcionando
4. **@factory/orchestrator** — meta-orquestrador com decomposição de tarefas
5. **@factory/shared-types** — tipos TypeScript compartilhados
6. **COMPANY.md** — constituição estratégica da empresa
7. **CLAUDE.md + SOUL.md** — identidade e regras dos agentes
8. **GitHub Actions** — CI automático, sync do COMPANY.md, deploy staging
9. **Specs de agentes** — orchestrator, code, deploy, gtm
10. **apps/unifystudio** — scaffold do primeiro produto

**Para começar a usar:**
```bash
cd saas-factory
cp .env.example .env
# preencha o .env com suas credenciais
pnpm install
pnpm --filter @factory/orchestrator demo
```
