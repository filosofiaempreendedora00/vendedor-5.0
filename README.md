# Closer Lab

Ferramenta pessoal de auto-aperfeiçoamento como Closer.

## Features
1. **Revisão de reuniões** — nome, link da gravação, data, pontos positivos, pontos a melhorar e principal aprendizado.

## Rodar
```bash
npm install
npm run dev   # http://localhost:3000
```
Sem `.env`, o app roda em **modo local** (dados só no navegador). Com Supabase configurado, salva na nuvem com login por e-mail.

## Configurar o Supabase
1. Crie um projeto em https://supabase.com.
2. **SQL Editor → New query** → cole o conteúdo de `supabase/schema.sql` → **Run**.
3. **Project Settings → API**: copie a *Project URL* e a *anon public key*.
4. Copie `.env.example` para `.env` e preencha as duas variáveis.
5. **Authentication → URL Configuration**: *Site URL* = `http://localhost:3000` (adicione também a URL de produção quando fizer deploy).
6. Reinicie o `npm run dev` e entre com seu e-mail (link mágico).

## Estrutura
- `src/lib/repo.ts` — camada de dados (Supabase ou localStorage)
- `src/components/` — telas
- `supabase/schema.sql` — tabelas + RLS (cada usuário só vê os próprios dados)
