-- @factory/attnres-memory — Supabase schema
-- Apply this migration before using the SupabaseAdapter.

-- Enable pgvector if you plan to add embedding-based retrieval later.
create extension if not exists vector with schema extensions;

-- Core memories table.
create table if not exists attnres_memories (
  id          uuid primary key default gen_random_uuid(),
  content     text        not null,
  importance  float8      not null default 0.5
    check (importance >= 0 and importance <= 1),
  block_type  text        not null default 'recent'
    check (block_type in ('recent', 'relevant', 'foundational')),
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  last_accessed timestamptz not null default now(),
  access_count integer    not null default 0,
  decay_rate  float8      not null default 0.95
    check (decay_rate >= 0 and decay_rate <= 1)
);

-- Indexes for the most common query patterns.
create index if not exists idx_attnres_importance
  on attnres_memories (importance desc);

create index if not exists idx_attnres_block_type
  on attnres_memories (block_type);

create index if not exists idx_attnres_last_accessed
  on attnres_memories (last_accessed desc);

create index if not exists idx_attnres_created_at
  on attnres_memories (created_at desc);

-- Full-text search index on content.
create index if not exists idx_attnres_content_trgm
  on attnres_memories using gin (content gin_trgm_ops);

-- Optional: embedding column for vector similarity search.
-- Uncomment and adjust dimensions as needed.
-- alter table attnres_memories add column embedding vector(1536);
-- create index idx_attnres_embedding on attnres_memories
--   using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Row Level Security.
alter table attnres_memories enable row level security;

-- Default policy: allow all operations for authenticated users.
-- Tighten this in production to scope memories per user/agent.
create policy "Allow authenticated access"
  on attnres_memories
  for all
  to authenticated
  using (true)
  with check (true);
