import { useEffect, type ReactNode } from 'react'
import SaveIndicator from './SaveIndicator'

export type Section = 'meetings' | 'prompts'

export interface ShellProps {
  section: Section
  onSection: (s: Section) => void
  userEmail: string | null
  onSignOut?: () => void
  onBackup: () => void
}

interface Props extends ShellProps {
  onNew: () => void
  query: string
  onQuery: (q: string) => void
  searchPlaceholder: string
  list: ReactNode
  main: ReactNode
  overlay?: ReactNode
  toast?: string | null
}

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'meetings', label: 'Reuniões' },
  { id: 'prompts', label: 'Prompts' },
]

export default function Layout(p: Props) {
  const { onNew } = p

  // Atalho: "N" cria um novo item na seção atual
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey) return
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        onNew()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNew])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="brand">
            <span className="brand-mark">◆</span> Closer Lab
          </div>
          <SaveIndicator />
          <button className="btn btn-primary btn-sm" onClick={onNew} title="Novo (N)">
            + Novo
          </button>
        </div>

        <div className="tabs" role="tablist">
          {SECTIONS.map(s => (
            <button key={s.id} role="tab" aria-selected={p.section === s.id} className={`tab ${p.section === s.id ? 'active' : ''}`} onClick={() => p.onSection(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        <input className="search" placeholder={p.searchPlaceholder} value={p.query} onChange={e => p.onQuery(e.target.value)} />

        <nav className="meeting-list">{p.list}</nav>

        <div className="sidebar-foot">
          {p.userEmail ? (
            <span className="muted ellipsis" title={p.userEmail}>{p.userEmail}</span>
          ) : (
            <span className="warn-text" title="Configure o Supabase no arquivo .env para salvar na nuvem">● Modo local</span>
          )}
          <span className="foot-actions">
            <button className="link-btn" onClick={p.onBackup} title="Baixa um arquivo com todas as suas reuniões e prompts">Backup</button>
            {p.onSignOut && <button className="link-btn" onClick={p.onSignOut}>Sair</button>}
          </span>
        </div>
      </aside>

      <main className="main">{p.main}</main>

      {p.overlay}
      {p.toast && <div className="toast">{p.toast}</div>}
    </div>
  )
}
