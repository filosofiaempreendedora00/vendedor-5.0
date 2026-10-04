-- Closer Lab — Feature 3: processo de reunião (pitch) com histórico de versões
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

create table if not exists public.playbooks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  content    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playbook_versions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label      text not null,
  content    jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists playbook_versions_user_idx on public.playbook_versions (user_id, created_at desc);

drop trigger if exists playbooks_touch on public.playbooks;
create trigger playbooks_touch before update on public.playbooks
  for each row execute function public.touch_updated_at();

alter table public.playbooks enable row level security;
alter table public.playbook_versions enable row level security;

drop policy if exists "own playbook" on public.playbooks;
create policy "own playbook" on public.playbooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own playbook versions" on public.playbook_versions;
create policy "own playbook versions" on public.playbook_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
