import { useEffect, type ReactNode } from 'react'
import SaveIndicator from './SaveIndicator'
import Icon from './Icon'

export type Section = 'meetings' | 'playbook' | 'messages' | 'prompts'

export const SECTIONS: { id: Section; label: string; hint: string }[] = [
  { id: 'meetings', label: 'Reuniões', hint: 'Revisão das calls' },
  { id: 'playbook', label: 'Processo', hint: 'Roteiro do pitch' },
  { id: 'messages', label: 'Mensagens', hint: 'Textos para leads' },
  { id: 'prompts', label: 'Prompts', hint: 'Biblioteca do Claude' },
]

export interface ShellProps {
  section: Section
  onSection: (s: Section) => void
  userEmail: string | null
  onSignOut?: () => void
  onBackup: () => void
}

interface Props extends ShellProps {
  onNew: () => void
  newLabel: string
  query?: string
  onQuery?: (q: string) => void
  searchPlaceholder?: string
  list: ReactNode
  main: ReactNode
  overlay?: ReactNode
  toast?: string | null
}

export default function Layout(p: Props) {
  const { onNew } = p
  const current = SECTIONS.find(s => s.id === p.section)!

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
      <nav className="rail" aria-label="Seções">
        <div className="rail-brand">
          <span className="brand-mark">◆</span>
          <span className="rail-label">Closer Lab</span>
        </div>

        <div className="rail-items">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`rail-item ${p.section === s.id ? 'active' : ''}`}
              aria-current={p.section === s.id ? 'page' : undefined}
              onClick={() => p.onSection(s.id)}
              title={s.label}
            >
              <Icon name={s.id} />
              <span className="rail-text">
                <span className="rail-label">{s.label}</span>
                <span className="rail-hint">{s.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="rail-foot">
          <SaveIndicator />
          {p.userEmail ? (
            <span className="rail-email ellipsis" title={p.userEmail}>{p.userEmail}</span>
          ) : (
            <span className="warn-text rail-label" title="Configure o Supabase no arquivo .env para salvar na nuvem">● Modo local</span>
          )}
          <button className="rail-action" onClick={p.onBackup} title="Baixa um arquivo com todos os seus dados">
            <Icon name="backup" size={17} /> <span className="rail-label">Baixar backup</span>
          </button>
          {p.onSignOut && (
            <button className="rail-action" onClick={p.onSignOut} title="Sair">
              <Icon name="logout" size={17} /> <span className="rail-label">Sair</span>
            </button>
          )}
        </div>
      </nav>

      <aside className="sidebar">
        <div className="sidebar-head">
          <h2 className="sidebar-title">{current.label}</h2>
          <button className="btn btn-primary btn-sm" onClick={onNew} title={`${p.newLabel} (N)`}>
            + {p.newLabel}
          </button>
        </div>

        {p.onQuery && (
          <input className="search" placeholder={p.searchPlaceholder} value={p.query} onChange={e => p.onQuery!(e.target.value)} />
        )}

        <div className="meeting-list">{p.list}</div>
      </aside>

      <main className="main">{p.main}</main>

      {p.overlay}
      {p.toast && <div className="toast">{p.toast}</div>}
    </div>
  )
}
