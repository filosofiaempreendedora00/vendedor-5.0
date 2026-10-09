-- Closer Lab — mensagens/prompts com partes (ex.: enquete com pergunta + opções)
alter table public.messages add column if not exists parts jsonb not null default '[]';
alter table public.prompts  add column if not exists parts jsonb not null default '[]';
