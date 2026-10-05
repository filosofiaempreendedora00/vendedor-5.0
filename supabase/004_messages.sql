-- Closer Lab — Feature 4: banco de mensagens prontas + categorias nos prompts
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

alter table public.prompts add column if not exists category text not null default '';

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null,
  content    text not null default '',
  category   text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists messages_user_idx on public.messages (user_id);

drop trigger if exists messages_touch on public.messages;
create trigger messages_touch before update on public.messages
  for each row execute function public.touch_updated_at();

alter table public.messages enable row level security;

drop policy if exists "own messages" on public.messages;
create policy "own messages" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
