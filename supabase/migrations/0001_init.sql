-- Migration 0001_init.sql
-- Table: visitors

create table if not exists visitors (
  id uuid primary key default gen_random_uuid(),
  visit_count int not null default 0,
  session_count int not null default 0,
  refresh_count int not null default 0,
  time_spent_seconds int not null default 0,
  clicks jsonb not null default '{}'::jsonb,        -- { [elementId]: count }
  corruption_level int not null default 0,         -- 0-5
  eggs_found text[] not null default '{}'::text[],
  endings_seen text[] not null default '{}'::text[],
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table visitors enable row level security;

-- Allow public reads and writes for visitors by their id
create policy "Allow anonymous visitor select by id"
  on visitors for select
  using (true);

create policy "Allow anonymous visitor insert"
  on visitors for insert
  with check (true);

create policy "Allow anonymous visitor update"
  on visitors for update
  using (true);

create index if not exists idx_visitors_last_seen on visitors(last_seen_at);
