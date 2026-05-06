create extension if not exists vector;

create table if not exists public.documents (
  id bigserial primary key,
  chunk_id text not null unique,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

alter table public.documents
  add column if not exists chunk_id text;

alter table public.documents
  add column if not exists content text;

alter table public.documents
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.documents
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists documents_chunk_id_idx
  on public.documents (chunk_id);

create index if not exists documents_embedding_idx
  on public.documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists documents_metadata_idx
  on public.documents
  using gin (metadata);

create or replace function public.match_documents(
  query_embedding vector(1536),
  match_count int default 6,
  metadata_filter jsonb default '{}'::jsonb
)
returns table (
  id bigint,
  chunk_id text,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    documents.id,
    documents.chunk_id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from public.documents
  where documents.metadata @> metadata_filter
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;
