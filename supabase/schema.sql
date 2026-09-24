-- Closer Lab — schema inicial (Feature 1: revisão de reuniões)
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  url          text,
  meeting_date date not null default current_date,
  notes        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.meeting_points (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('positive', 'negative')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists meetings_user_date_idx on public.meetings (user_id, meeting_date desc);
create index if not exists meeting_points_meeting_idx on public.meeting_points (meeting_id, created_at);

-- updated_at automático
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists meetings_touch on public.meetings;
create trigger meetings_touch before update on public.meetings
  for each row execute function public.touch_updated_at();

-- Segurança: cada usuário só enxerga e altera os próprios dados
alter table public.meetings enable row level security;
alter table public.meeting_points enable row level security;

drop policy if exists "own meetings" on public.meetings;
create policy "own meetings" on public.meetings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own points" on public.meeting_points;
create policy "own points" on public.meeting_points
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
