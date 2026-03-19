# API — Factorify

Endpoint de entrada de tarefas para o Meta-Orchestrator.

## Responsabilidades
- Receber tasks via HTTP POST /tasks
- Autenticar chamadas (API key ou JWT)
- Passar para o orquestrador com prioridade e contexto
- Retornar status e resultado da execução

## Stack
- Node.js + TypeScript + Fastify
- Supabase para persistência de tasks
- Vercel Edge Functions para deploy

## Status
Scaffold criado — implementação pendente (Fase 1, Sprint 2)
