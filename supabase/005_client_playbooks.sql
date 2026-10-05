-- Closer Lab — Feature 5: roteiros por cliente (herdam o processo padrão)
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

create table if not exists public.client_playbooks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name         text not null,
  company      text not null default '',
  meeting_date date not null default current_date,
  context      text not null default '',
  notes        text not null default '',
  overlay      jsonb not null default '{"overrides":{},"hidden":[],"additions":[],"answers":{},"checked":[]}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists client_playbooks_user_idx on public.client_playbooks (user_id, meeting_date desc);

drop trigger if exists client_playbooks_touch on public.client_playbooks;
create trigger client_playbooks_touch before update on public.client_playbooks
  for each row execute function public.touch_updated_at();

alter table public.client_playbooks enable row level security;

drop policy if exists "own client playbooks" on public.client_playbooks;
create policy "own client playbooks" on public.client_playbooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
