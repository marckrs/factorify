# COMPANY.md — Constituicao Estrategica
# Autonomous SaaS Factory | Marcelo Lermen | v1.0.0

## Identidade da Empresa

- **Nome**: Factorify — Autonomous SaaS Factory
- **Fundador**: Marcelo Lermen (solo founder)
- **Modelo**: One-person company operada por agentes de IA autônomos
- **Jurisdição**: Brasil
- **Idioma primário**: Português (BR) para comunicação com clientes; inglês para código e documentação técnica

## Missão

Construir e operar produtos SaaS de forma autônoma usando agentes de IA especializados,
com supervisão humana apenas para decisões irreversíveis. Cada produto é concebido,
desenvolvido, testado, deployado e operado majoritariamente por agentes — o fundador
atua como estrategista, curator e gatekeeper final.

## Visão

Ser referência em SaaS factories autônomas na América Latina, provando que uma pessoa
com a arquitetura certa de agentes pode competir com equipes inteiras — entregando
produtos de qualidade superior com custos operacionais mínimos.

---

## Primeiro Produto: UnifyStudio

### O que é
Plugin Figma para AdTech que converte Key Visuals (KVs) em pacotes completos de mídia
em minutos. O designer cria um único KV e o UnifyStudio gera automaticamente todos os
formatos necessários para campanhas multicanal.

### Problema que resolve
Designers e agências de performance gastam horas (às vezes dias) adaptando um KV para
dezenas de formatos de mídia. O processo é repetitivo, propenso a erros e consome tempo
criativo que poderia ser investido em estratégia e conceito.

### Proposta de valor
- **Para designers**: elimina trabalho repetitivo de adaptação de formatos
- **Para agências**: reduz tempo de produção de dias para minutos
- **Para traffic managers**: recebe pacotes completos e consistentes mais rápido

### Mercado-alvo
- **Primário**: Agências de performance brasileiras (pequenas e médias)
- **Secundário**: Designers freelancers que atendem múltiplos clientes
- **Terciário**: Traffic managers que precisam de assets rápidos para testes A/B

### Modelo de negócio: SaaS por assinatura

| Plano     | Preço (BRL/mês) | Limites                          | Público              |
|-----------|------------------|----------------------------------|----------------------|
| Starter   | R$ 49            | 50 exports/mês, 1 usuário       | Freelancers          |
| Pro       | R$ 149           | 300 exports/mês, 5 usuários     | Pequenas agências    |
| Agency    | R$ 399           | Ilimitado, 20 usuários, API     | Agências médias      |

- Trial gratuito de 14 dias (sem cartão)
- Billing via Stripe com suporte a PIX
- Upsell via exports adicionais sob demanda

### Métricas-chave (North Star)
- **Ativação**: primeiro export completo em < 5 minutos após instalação
- **Retenção**: uso semanal recorrente (>= 1 export por semana)
- **Conversão**: trial-to-paid >= 15%
- **NPS**: >= 50 nos primeiros 6 meses

---

## Stack Tecnológico

### Core
- **Linguagem**: TypeScript (strict mode, sem exceção)
- **Runtime**: Node.js 22+
- **Gerenciador de pacotes**: pnpm workspaces (monorepo)

### Backend & Dados
- **Banco de dados**: Supabase (PostgreSQL + pgvector)
- **Autenticação**: Supabase Auth
- **Storage**: Supabase Storage (assets de mídia)
- **Row Level Security**: obrigatório em todas as tabelas

### Frontend & Deploy
- **Framework**: React (dentro do Figma plugin SDK)
- **Deploy web**: Vercel (edge functions + static hosting)
- **CDN**: Vercel Edge Network

### CI/CD & Infra
- **CI/CD**: GitHub Actions
- **Monitoramento**: Structured JSON logging
- **Secrets**: variáveis de ambiente (nunca hardcoded)

### IA & Agentes
- **LLM principal**: Claude (Anthropic) via API
- **Memória**: AttnRes (Attention Reservoir) — sistema próprio de memória em camadas
- **Orquestração**: Multi-agent orchestrator com threshold humano

---

## Architecture Decision Records (ADRs)

### ADR-001: Monorepo com pnpm workspaces

**Status**: Aceito
**Contexto**: Com múltiplos produtos SaaS e bibliotecas compartilhadas, precisamos de
uma estrutura que permita reutilização de código sem overhead de publicação de pacotes.
**Decisão**: Monorepo com pnpm workspaces. Estrutura:
- `packages/` — libs compartilhadas (`@factory/*`)
- `agents/` — specs e lógica dos agentes
- `apps/` — produtos SaaS (cada um com CLAUDE.md próprio)
- `infra/` — GitHub Actions, Docker, configurações de infra
- `config/` — configurações base (tsconfig, eslint, templates)
- `scripts/` — scripts utilitários da factory

**Consequências**: Builds mais rápidos com cache; lei de importação rigorosa
(`apps/` e `agents/` importam de `packages/`, nunca entre si).

### ADR-002: AttnRes Memory — Sistema de memória em camadas

**Status**: Aceito
**Contexto**: Agentes de IA perdem contexto entre sessões. Precisamos de memória
persistente que priorize informações por relevância e importância.
**Decisão**: AttnRes (Attention Reservoir) com três camadas:
- **Foundational**: verdades permanentes (COMPANY.md, CLAUDE.md, SOUL.md)
- **Relevant**: decisões e padrões do projeto atual
- **Recent**: contexto da sessão corrente

Armazenamento em Supabase com pgvector para busca semântica.
Cada bloco de memória tem: `content`, `importance` (0-1), `block_type`, `metadata`.

**Consequências**: Agentes mantêm coerência entre sessões; custo de storage proporcional
à quantidade de memórias (controlável via TTL e importance threshold).

### ADR-003: Multi-agent orchestration com threshold humano

**Status**: Aceito
**Contexto**: Um único agente generalista não consegue manter qualidade em todas as
tarefas. Precisamos de especialização com coordenação.
**Decisão**: Orquestrador central que delega para agentes especializados:
- **Architect**: decisões de design e arquitetura
- **Developer**: implementação de código
- **Reviewer**: code review e qualidade
- **DevOps**: CI/CD, deploy, monitoramento
- **Product**: requisitos, priorização, métricas

Threshold humano obrigatório para:
- Deploy em produção com usuários reais
- Gastos acima de R$ 500/mês
- Mudanças em segurança ou dados pessoais
- Contratos com terceiros

**Consequências**: Agentes operam autonomamente dentro de limites seguros; fundador
foca em estratégia e decisões de alto impacto.

### ADR-004: Bootstrap com free tiers primeiro

**Status**: Aceito
**Contexto**: Como solo founder sem investimento externo, cada centavo conta.
**Decisão**: Sempre começar com free tiers dos serviços. Escalar para planos pagos
apenas quando limites forem atingidos com receita para cobrir.
- Supabase Free Tier (500 MB database, 1 GB storage)
- Vercel Hobby (100 GB bandwidth)
- GitHub Free (unlimited repos, 2000 min/mês Actions)

**Consequências**: Custo operacional inicial perto de zero; necessidade de otimizar
uso de recursos desde o dia um.

---

## Restrições Financeiras

- **Modelo**: Bootstrap — zero investimento externo
- **Regra de ouro**: nunca gastar mais do que a receita recorrente mensal (MRR)
- **Free tiers primeiro**: só escalar quando limites forem atingidos
- **Orçamento mensal máximo (pré-receita)**: R$ 200 para infraestrutura
- **Aprovação humana obrigatória**: qualquer gasto acima de R$ 500/mês

### Prioridades de investimento (quando houver receita)
1. Infraestrutura (manter SLA para clientes pagantes)
2. APIs de IA (Claude, embeddings)
3. Ferramentas de desenvolvimento (GitHub Copilot, domínios)
4. Marketing e aquisição

---

## Valores e Princípios Operacionais

### Precisão acima de velocidade
Um resultado correto vale mais que dez rascunhos. Cada entrega deve estar completa
e pronta para uso — nunca fragmentada ou parcial.

### Transparência total
Toda decisão tem raciocínio documentado. Agentes explicam o "porquê", não apenas o "o quê".
Erros são registrados como memórias foundational para aprendizado futuro.

### Qualidade sobre quantidade
Menos features, melhor executadas. O primeiro produto precisa ser excelente antes
de pensar no segundo.

### Economia inteligente
Otimizar custos não significa cortar qualidade. Significa usar recursos com sabedoria:
free tiers, caching agressivo, batch processing quando possível.

### Autonomia com guardrails
Agentes têm liberdade para decidir e agir dentro de limites claros. Quando o limite
é atingido, escalam para o humano sem hesitação.

---

## Roadmap de Alto Nível

### Fase 1 — Fundação (atual)
- [x] Monorepo configurado com pnpm workspaces
- [x] CLAUDE.md, SOUL.md e COMPANY.md definidos
- [x] Sistema AttnRes memory implementado
- [x] Orquestrador multi-agente funcional
- [ ] Pipeline CI/CD com GitHub Actions
- [ ] Supabase configurado com schema inicial

### Fase 2 — MVP UnifyStudio
- [ ] Figma plugin skeleton funcional
- [ ] Engine de adaptação de formatos (core)
- [ ] Integração com Supabase para persistência
- [ ] Sistema de autenticação e billing
- [ ] Beta fechado com 10 agências brasileiras

### Fase 3 — Launch & Growth
- [ ] Launch público no Figma Community
- [ ] Onboarding automatizado
- [ ] Dashboard de métricas para agências
- [ ] Iteração baseada em feedback real

### Fase 4 — Expansão
- [ ] Segundo produto SaaS (a definir com base em dados)
- [ ] API pública para integrações
- [ ] Expansão para LATAM (espanhol)

---

## Contato

- **Fundador**: Marcelo Lermen
- **Repositório**: github.com/mlermen/factorify (privado)
- **Produto**: UnifyStudio (em desenvolvimento)
