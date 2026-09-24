-- Closer Lab — Feature 2: biblioteca de prompts
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

create table if not exists public.prompts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null,
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prompts_user_idx on public.prompts (user_id);

drop trigger if exists prompts_touch on public.prompts;
create trigger prompts_touch before update on public.prompts
  for each row execute function public.touch_updated_at();

alter table public.prompts enable row level security;

drop policy if exists "own prompts" on public.prompts;
create policy "own prompts" on public.prompts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
