# COMPANY.md — Constituição Estratégica do Factorify
<!-- version: 2.0.0 | updated: 2026-03-19 | owner: Marcelo Lermen -->
<!-- INSTRUÇÃO PARA AGENTES: Este documento é sua fonte primária de contexto
     estratégico. Consulte-o antes de qualquer decisão de arquitetura,
     priorização ou comunicação. Nunca contradiga os constraints desta
     constituição sem aprovação humana explícita. -->

---

## 1. IDENTIDADE

```yaml
empresa:
  nome:    "Factorify"
  tipo:    "Plataforma de engenharia autônoma"
  missao: >
    Construir e operar uma plataforma que desenvolve, testa, revisa, faz
    deploy e monitora software de forma quase totalmente autônoma —
    reduzindo a intervenção humana ao mínimo necessário para decisões
    estratégicas e aprovações de alto impacto.
  visao: >
    Em 12 meses, o Factorify opera como uma plataforma madura de agentic
    software engineering, capaz de entregar produtos SaaS completos a partir
    de uma descrição em linguagem natural, com menos de 4h/semana de
    intervenção humana do fundador.
  posicionamento: >
    O Factorify não é um produto SaaS. É a fábrica que constrói produtos SaaS.
    É o sistema operacional de uma empresa de software autônoma.
```

---

## 2. FASES DE EVOLUÇÃO

```yaml
fases:
  fase_1:
    nome: "Agentic Software Engineering"
    status: "ativa — em construção"
    descricao: >
      A plataforma recebe uma tarefa técnica em linguagem natural e a executa
      de forma autônoma: decompõe em subtasks, roteia para agentes
      especializados (DEV/OPS/BIZ), executa com memória seletiva (AttnRes),
      testa, revisa, faz deploy e reporta. Humano aprova apenas nos
      checkpoints definidos (deploy em produção, gastos acima do threshold).
    entregaveis_chave:
      - "Meta-Orchestrator com decomposição e execução paralela"
      - "AttnRes Memory — memória seletiva por agente"
      - "9 agentes especializados (DEV + OPS + BIZ)"
      - "Pipeline CI/CD autônomo (staging autônomo, produção com aprovação)"
      - "Dashboard de controle humano"
      - "API e CLI de entrada de tarefas"
      - "COMPANY.md como fonte única de verdade estratégica"
    criterio_conclusao: >
      A plataforma constrói um produto SaaS funcional do zero a partir de
      um briefing em linguagem natural, com aprovação humana apenas no
      deploy final de produção.

  fase_2:
    nome: "Agentic Business Engineering"
    status: "futura — planejada"
    descricao: >
      A plataforma evolui de construir software para operar negócios completos:
      valida ideias com usuários reais, define pricing, lança, monitora
      métricas de negócio, ajusta estratégia e gerencia o ciclo de vida
      completo de um produto — com intervenção humana mínima.
    prerequisito: >
      Fase 1 validada com pelo menos 1 produto externo construído e operado
      pela plataforma com sucesso por 90 dias consecutivos.
    capacidades_adicionais:
      - "Agente de validação de mercado (entrevistas, análise de concorrentes)"
      - "Agente de growth (SEO, conteúdo, paid media automatizado)"
      - "Agente financeiro (projeções, unit economics, alertas de runway)"
      - "Agente de produto (priorização de backlog por dados de uso)"
```

---

## 3. O QUE O FACTORIFY PRODUZ

```yaml
output_da_plataforma:
  nota: >
    O Factorify produz outros produtos — ele não É um produto.
    Os itens abaixo são exemplos de outputs futuros da plataforma,
    não escopo do projeto Factorify em si.

  exemplos_futuros:
    - nome: "UnifyStudio"
      descricao: "Plugin Figma AdTech — desdobramento de KV para mídia paga"
      status: "será construído pela plataforma quando Fase 1 estiver pronta"

    - nome: "LiteClaw"
      descricao: "Agente de IA local-first, multi-LLM, multi-canal"
      status: "será construído pela plataforma quando Fase 1 estiver pronta"

    - nome: "[produto-N]"
      descricao: "Qualquer produto SaaS com dor validada + ticket >= R$300/mês"
      status: "pipeline — critérios de entrada definidos na Fase 2"

  criterios_entrada_produto:
    - "Dor validada com 10+ potenciais clientes antes de uma linha de código"
    - "Ticket médio mínimo R$ 300/mês"
    - "Construível com o core tecnológico existente da plataforma"
    - "Mercado endereçável mínimo de 10.000 empresas no Brasil"
```

---

## 4. CONTEXTO DO FUNDADOR

```yaml
fundador:
  nome:     "Marcelo Lermen"
  papel:    "Arquiteto do sistema e decisor final nos checkpoints humanos"
  contexto:
    - "Superintendente de TI e Infraestrutura em cooperativa financeira (BACEN/FEBRABAN)"
    - "Sócio de agência de publicidade em São Paulo"
    - "Background em operações e gestão — não desenvolvedor"
  preferencias_de_entrega:
    - "Arquivos sempre completos e prontos para uso — nunca fragmentados"
    - "Execuções sempre pelo Claude Code (CC) — humano só o que CC não alcança"
    - "Intros e encerramentos em português; código em inglês"
    - "Autonomia máxima dos agentes com checkpoints humanos mínimos"
  aprovacao_requerida_para:
    - "Deploy em produção com usuários reais"
    - "Gastos de infra acima de R$ 500/mês"
    - "Contratos ou compromissos com terceiros"
    - "Mudanças na arquitetura de segurança ou dados pessoais"
    - "Mudanças neste COMPANY.md"
```

---

## 5. ARQUITETURA DA PLATAFORMA

```yaml
stack_global:
  linguagens:   ["TypeScript (strict)", "Python 3.11+"]
  runtime:      ["Node.js 22"]
  banco:        ["Supabase (Postgres + pgvector)"]
  deploy:       ["Vercel (frontend + edge)", "Railway (backends Python)"]
  versionamento: "GitHub (marckrs/factorify)"
  local:        "/Users/mlermen/Documents/GitHub/factorify"
  mcp_ativos:   ["Supabase", "GitHub", "Vercel", "Notion", "Stripe", "Gmail"]

monorepo:
  gerenciador: "pnpm workspaces"
  camadas:
    packages/: "Libs compartilhadas da plataforma (@factory/*)"
    agents/:   "Specs e lógica dos agentes especializados"
    apps/:     "Aplicações da própria plataforma (dashboard, api, cli)"
    infra/:    "GitHub Actions, Docker, configurações de infra"
    config/:   "Configurações base (tsconfig, eslint, templates)"
  lei_de_importacao: "apps/ e agents/ importam de packages/ — nunca entre si"

packages_atuais:
  - "@factory/attnres-memory"   # concluído — 15 testes passando
  - "@factory/orchestrator"      # concluído — 23 testes passando
  - "@factory/shared-types"      # concluído
  - "@factory/mcp-servers"       # Sprint 4 — wrappers typed para MCPs + canal A2A
  - "@factory/ui-primitives"     # a criar — componentes React base

apps_da_plataforma:
  - "apps/dashboard"  # painel de controle humano
  - "apps/api"        # endpoint de entrada de tarefas
  - "apps/cli"        # interface de linha de comando
```

---

## 6. AGENTES DA PLATAFORMA

```yaml
agentes:
  cluster_dev:
    - id: code
      papel: "Escreve, refatora e corrige código TypeScript/Python"
      spec: "agents/dev/code/spec.md"
      status: "spec criado"
    - id: test
      papel: "Escreve testes automatizados e analisa cobertura"
      spec: "agents/dev/test/spec.md"
      status: "spec a criar"
    - id: review
      papel: "Revisa código: segurança, performance, arquitetura"
      spec: "agents/dev/review/spec.md"
      status: "spec a criar"

  cluster_ops:
    - id: deploy
      papel: "Executa deploys seguros via Vercel MCP"
      spec: "agents/ops/deploy/spec.md"
      status: "spec criado"
    - id: monitor
      papel: "Monitora saúde da plataforma e detecta anomalias"
      spec: "agents/ops/monitor/spec.md"
      status: "spec a criar"
    - id: incident
      papel: "Diagnostica e remedia incidentes de produção"
      spec: "agents/ops/incident/spec.md"
      status: "spec a criar"

  cluster_biz:
    - id: gtm
      papel: "Define estratégia go-to-market dos produtos da plataforma"
      spec: "agents/biz/gtm/spec.md"
      status: "spec criado"
    - id: analytics
      papel: "Analisa métricas da plataforma e dos produtos gerados"
      spec: "agents/biz/analytics/spec.md"
      status: "spec a criar"
    - id: support
      papel: "Atende usuários dos produtos gerados pela plataforma"
      spec: "agents/biz/support/spec.md"
      status: "spec a criar"

  orquestrador:
    - id: orchestrator
      papel: "Decompõe tasks, roteia agentes, sintetiza resultados"
      spec: "agents/orchestrator/spec.md"
      status: "spec criado | código criado"
```

---

## 7. DECISÕES ARQUITETURAIS (ADRs)

```yaml
adrs:
  - id: ADR-001
    titulo: "AttnRes como camada de memória dos agentes"
    data: "2026-03-18"
    status: "aceito"
    decisao: >
      Adotar AttnRes Block Memory (inspirado no paper Moonshot AI, março 2026)
      como mecanismo central de memória. Cada agente tem um pseudo-query vetor
      que direciona atenção para blocos recent/relevant/foundational.

  - id: ADR-002
    titulo: "Monorepo pnpm com 5 camadas"
    data: "2026-03-18"
    status: "aceito"
    decisao: >
      packages/ | agents/ | apps/ | infra/ | config/
      Lei de importação única: apps/ e agents/ importam de packages/.

  - id: ADR-003
    titulo: "Aprovação humana para deploy em produção"
    data: "2026-03-18"
    status: "aceito"
    decisao: >
      Staging: autônomo. Produção: sempre requer confirmação explícita
      do fundador. Janela de deploy: sextas 14h–17h (exceto hotfixes).

  - id: ADR-004
    titulo: "COMPANY.md como fonte única de verdade estratégica"
    data: "2026-03-18"
    status: "aceito"
    decisao: >
      Todo contexto estratégico vive aqui. Sync automático indexa no AttnRes
      como memórias foundational (importance 0.90–1.00).

  - id: ADR-005
    titulo: "CC executa tudo — humano apenas o que CC não alcança"
    data: "2026-03-19"
    status: "aceito"
    decisao: >
      Claude Code (CC) executa todas as operações técnicas. O fundador
      executa manualmente apenas: login em interfaces web, autorizações
      OAuth, aprovações de deploy em produção e inputs de dados sensíveis.

  - id: ADR-006
    titulo: "Escopo do Factorify é a plataforma, não os produtos"
    data: "2026-03-19"
    status: "aceito"
    decisao: >
      Factorify = plataforma autônoma de engenharia. Os produtos SaaS
      (UnifyStudio, LiteClaw, etc.) são outputs futuros da plataforma —
      não são escopo do repositório factorify.

  - id: ADR-007
    titulo: "Prompt Caching em todos os agentes"
    data: "2026-03-19"
    status: "aceito"
    decisao: >
      Todos os blocos estáticos de system prompt (base do agente,
      contexto do COMPANY.md via AttnRes) devem usar cache_control
      ephemeral na API Anthropic. Blocos dinâmicos (user message,
      contexto de sessão) nunca devem ser cacheados.
    impacto: "Redução estimada de 70-80% no custo de tokens dos agentes"
    implementacao: "apps/api/src/llm-runner.ts"

  - id: ADR-008
    titulo: "Audit log imutável (append-only) antes de produção real"
    data: "2026-03-19"
    status: "implementado — Sprint 5 (2026-03-19)"
    contexto: >
      O agents_log atual permite UPDATE nas linhas — qualquer agente pode
      sobrescrever um registro de execução. Em um sistema que opera negócios
      reais com usuários e dinheiro, isso é inaceitável para auditoria e
      compliance (especialmente relevante dado o contexto regulatório BACEN
      do fundador).
    decisao: >
      Antes de qualquer produto gerado pelo Factorify entrar em produção
      com usuários reais, a tabela agents_log deve ser tornada append-only:
      sem UPDATE, sem DELETE possível via API. Implementar via Postgres
      Row-Level Security com policy que permite apenas INSERT e SELECT.
      Adicionalmente, habilitar Supabase Point-in-Time Recovery (PITR)
      para o projeto de produção.
    implementacao:
      - "RLS policy: DENY UPDATE e DELETE em agents_log para service_role"
      - "Trigger Postgres: bloqueio adicional de UPDATE em nível de banco"
      - "PITR: habilitar no Supabase dashboard (requer plano Pro)"
      - "factory_tasks: mesma proteção — status pode avançar mas nunca voltar"
    sprint: 5
    prerequisito: "Antes de deploy de qualquer produto em produção com usuários reais"

  - id: ADR-009
    titulo: "Checkpointing de execução via estado persistente (LangGraph-inspired)"
    data: "2026-03-19"
    status: "candidato — Sprint 6"
    contexto: >
      O ParallelExecutor atual executa waves de tasks sem persistência
      de estado intermediário. Se a API cair no meio de uma task de 8h
      ou um wave de 5 agentes, toda a execução é perdida e começa do zero.
      Com tarefas cada vez mais longas (pesquisa mostra duração dobrando
      a cada 7 meses), isso se torna crítico.
    decisao: >
      Implementar checkpointing de estado de execução no Supabase.
      Cada wave concluída persiste seu estado antes de avançar para
      a próxima. Em caso de falha, o orquestrador retoma da última
      wave concluída, não do início. Inspirado no LangGraph mas
      implementado nativamente no stack TypeScript do Factorify —
      sem adicionar dependência externa.
    implementacao:
      - "Nova tabela: execution_checkpoints (plan_id, wave_level, state_json, completed_at)"
      - "ParallelExecutor: persist checkpoint após cada wave concluída"
      - "MetaOrchestrator: detect e resume de checkpoint existente antes de executar"
      - "Cleanup: remover checkpoints com > 7 dias automaticamente"
    sprint: 6
    prerequisito: "Tasks com duração > 30min em produção"

  - id: ADR-010
    titulo: "Protocolo A2A (Agent-to-Agent) para comunicação entre agentes"
    data: "2026-03-19"
    status: "candidato — Sprint 6"
    contexto: >
      Hoje agentes se comunicam via o orquestrador como intermediário:
      o code agent nunca fala diretamente com o test agent — o orquestrador
      gerencia toda a comunicação. Isso funciona bem para tasks simples,
      mas cria gargalo e latência em tasks complexas onde agentes precisam
      de múltiplos turnos de colaboração (ex: code agent e review agent
      iterando juntos até aprovação).
    decisao: >
      Definir e implementar um protocolo A2A interno para o Factorify.
      Agentes podem abrir canais diretos de comunicação para colaboração
      multi-turno, sem passar pelo orquestrador a cada mensagem.
      O orquestrador mantém supervisão (timeout, abort) mas não é
      intermediário de cada turno. Protocolo baseado em mensagens JSON
      via Supabase Realtime, com schema fixo para garantir interoperabilidade
      entre agentes TypeScript e futuros agentes Python.
    schema_mensagem:
      from_agent:  "AgentRole"
      to_agent:    "AgentRole"
      session_id:  "string"
      type:        "request | response | abort | checkpoint"
      payload:     "string (JSON)"
      created_at:  "timestamp"
    implementacao:
      - "Tabela: agent_messages (canal de comunicação A2A via Supabase Realtime)"
      - "AgentRunner: método sendMessage(toAgent, payload) e subscribeToMessages()"
      - "Protocolo: request → response → ack com timeout de 120s"
      - "Orquestrador: monitora canais A2A, pode abort se detectar loop"
    sprint: 6
    casos_de_uso:
      - "code agent + review agent: iteração até aprovação (máx 3 turnos)"
      - "monitor agent + incident agent: handoff de alerta com contexto completo"
      - "analytics agent + gtm agent: briefing de métricas para decisão de estratégia"

  - id: ADR-011
    titulo: "Reflexion + AttnRes como mecanismo de aprendizado continuo"
    data: "2026-03-19"
    status: "aceito — implementado Sprint 4"
    contexto: >
      Agentes repetiam os mesmos erros em execucoes sucessivas porque nao
      havia mecanismo para persistir aprendizados entre sessions. O paper
      Reflexion (Shinn et al., 2023) propoe reflexao verbal apos falhas,
      mas sua limitacao e memoria de curto prazo. O AttnRes resolve isso.
    decisao: >
      Apos cada subtask, o LearningLayer analisa o resultado com Claude
      e extrai aprendizados estruturados. Estes sao armazenados no AttnRes
      como memorias relevant (importance 0.72-0.80) e promovidos para
      foundational (0.92) apos 3 ocorrencias do mesmo padrao. O
      ErrorPatternDetector cria um PR automatico no GitHub propondo
      atualizacao no spec do agente ao atingir o threshold.
    garantias:
      - "LearningLayer nunca bloqueia o pipeline — fire-and-forget"
      - "Erros da propria LearningLayer sao silenciados (nunca propagam)"
      - "PR de spec update requer aprovacao humana antes de merge"
    impacto: >
      Agentes melhoram progressivamente com cada execucao.
      O Factorify acumula conhecimento operacional que nao se perde
      entre sessions ou reinicializacoes.

  - id: ADR-012
    titulo: "Template Registry para reutilizacao entre produtos SaaS"
    data: "2026-03-19"
    status: "aceito — scaffold Sprint atual | templates reais Fase 2"
    contexto: >
      Sem um sistema de reutilizacao, o code agent reconstroi as mesmas
      telas do zero em cada produto: login, dashboard, pricing, onboarding.
      Com N produtos, o custo cresce linearmente. Com templates, cresce
      logaritmicamente.
    decisao: >
      Criar e manter @factory/templates — catalogo vivo de telas e
      componentes producao-prontos. O code agent DEVE consultar o registry
      antes de implementar qualquer tela. Templates com status
      'production-ready' tem prioridade maxima de reutilizacao.
    instrucao_code_agent: >
      Antes de implementar qualquer tela: findTemplates({ search: '...' }).
      Se 'production-ready': use como base. Se vazio: implemente e registre.
      Sempre: incrementReuse(id, productName) ao reutilizar.
    implementacao: "packages/templates/src/registry.ts"
```

---

## 8. OKRs DA PLATAFORMA

```yaml
horizonte: "Q1-Q2 2026"

okrs:
  - objetivo: "Completar a Fase 1 — Agentic Software Engineering"
    prazo: "2026-05-31"
    key_results:
      - kr: "9 agentes com specs e código completos"
        status: "em andamento (4/9 specs, 2/9 código)"
        responsavel: "orchestrator + code"
      - kr: "Pipeline CI/CD autônomo end-to-end funcionando"
        status: "parcial (staging pendente, produção pendente)"
        responsavel: "deploy"
      - kr: "Dashboard de controle operacional"
        status: "scaffold criado, implementação pendente"
        responsavel: "code"
      - kr: "API e CLI de entrada de tarefas"
        status: "scaffold criado, implementação pendente"
        responsavel: "code"
      - kr: "COMPANY.md sincronizado e sendo consultado pelos agentes"
        status: "concluído — 30 seções indexadas no AttnRes"
        responsavel: "code"

  - objetivo: "Validar a plataforma construindo o primeiro produto externo"
    prazo: "2026-08-31"
    key_results:
      - kr: "Primeiro produto SaaS completo gerado pela plataforma"
        status: "aguarda conclusão da Fase 1"
        responsavel: "orchestrator"
      - kr: "Tempo de geração < 2 semanas do briefing ao MVP"
        status: "aguarda Fase 1"
        responsavel: "orchestrator"
      - kr: "Intervenção humana < 4h/semana durante operação"
        status: "aguarda Fase 1"
        responsavel: "monitor"
```

---

## 9. COMPLIANCE E SEGURANÇA

```yaml
regras_absolutas:
  - "TypeScript strict mode em TODOS os arquivos — sem any implícito"
  - "Secrets SEMPRE via variáveis de ambiente — nunca hardcoded"
  - "RLS ativo em TODAS as tabelas Supabase"
  - "Toda chamada de banco via Supabase MCP — nunca SQL direto no código"
  - "Logs estruturados (JSON) — nunca console.log em produção"
  - "Testes obrigatórios para código que vai a produção (min 80% cobertura)"
  - "Funções sempre versionadas (V2, V3) — nunca sobrescrever versão estável"

contexto_regulatorio:
  nota: >
    O fundador opera em ambiente regulado (BACEN/FEBRABAN).
    A plataforma Factorify em si não é um produto financeiro, mas deve
    seguir padrões de segurança equivalentes ao bancário:
    auditoria total, logs imutáveis, zero dados sensíveis em código.
```

---

## 10. INSTRUÇÃO DE USO PARA AGENTES

```yaml
antes_de_qualquer_acao:
  - "Consulte sua memória AttnRes — este documento está indexado como foundational"
  - "Verifique se a ação contradiz algum ADR desta constituição"
  - "Em dúvida entre velocidade e segurança: priorize segurança"

ao_tomar_decisoes_tecnicas:
  - "Prefira padrões dos ADRs antes de introduzir novidades"
  - "Novas dependências requerem justificativa documentada"
  - "O escopo do factorify é a plataforma — não desenvolva produtos SaaS aqui"

escalacao_obrigatoria:
  - "Deploy em produção → aguardar aprovação do fundador"
  - "Gastos de infra acima de R$ 500/mês → escalar"
  - "Incidentes críticos em produção → notificar imediatamente"
  - "Mudanças neste COMPANY.md → aprovação do fundador"

threshold_autonomia:
  deploy_staging:      "autônomo"
  deploy_producao:     "aprovação humana obrigatória"
  infra_ate_500_mes:   "autônomo"
  infra_acima_500:     "escalar para fundador"
  mudancas_company_md: "aprovação do fundador"

changelog:
  - data: "2026-03-18"
    versao: "1.0.0"
    mudancas: "Criação inicial"
  - data: "2026-03-19"
    versao: "2.0.0"
    autor: "Marcelo Lermen"
    mudancas: >
      Revisão completa de escopo. Removido portfólio de produtos (UnifyStudio,
      LiteClaw) do escopo do Factorify. Adicionados ADR-005 e ADR-006.
      Factorify redefinido como plataforma autônoma de engenharia —
      os produtos são outputs futuros, não escopo do projeto.
  - data: "2026-03-19"
    versao: "2.1.0"
    autor: "Marcelo Lermen + Claude"
    mudancas: >
      Sprint 2 completo. API conectada ao MetaOrchestrator com LLM real.
      Primeira task executada end-to-end. ADR-007 prompt caching.
      Adicionados ADR-008 (audit log imutavel), ADR-009 (checkpointing
      de execucao), ADR-010 (protocolo A2A entre agentes).
  - data: "2026-03-19"
    versao: "2.2.0"
    autor: "Marcelo Lermen + Claude"
    mudancas: >
      ADR-011: Learning Layer (Reflexion + AttnRes feedback loop).
      Agentes agora aprendem com erros e acumulam conhecimento operacional.
  - data: "2026-03-19"
    versao: "2.3.0"
    autor: "Marcelo Lermen + Claude"
    mudancas: >
      ADR-012: Template Registry (@factory/templates). 5 templates scaffold.
      Code agent deve consultar registry antes de implementar qualquer tela.
```
