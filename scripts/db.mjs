// Executa SQL no banco do Supabase com acesso administrativo.
// Uso: node scripts/db.mjs "select 1"   ou   node scripts/db.mjs -f arquivo.sql
import { readFileSync } from 'node:fs'
import pg from 'pg'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => /^\w+=/.test(l))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
)
const sql = process.argv[2] === '-f' ? readFileSync(process.argv[3], 'utf8') : process.argv[2]
const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const res = await client.query(sql)
  for (const r of [res].flat()) {
    if (r.rows?.length) console.table(r.rows)
    else console.log(`${r.command ?? 'OK'} ${r.rowCount ?? ''}`.trim())
  }
} finally {
  await client.end()
}
