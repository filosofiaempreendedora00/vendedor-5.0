-- Closer Lab — anexos (links de download) em mensagens e prompts
alter table public.messages add column if not exists attachments jsonb not null default '[]';
alter table public.prompts  add column if not exists attachments jsonb not null default '[]';
notify pgrst, 'reload schema';
