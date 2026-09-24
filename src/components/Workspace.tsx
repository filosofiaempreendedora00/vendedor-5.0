import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Repo } from '../lib/repo'
import type { Meeting, MeetingInput, MeetingPatch, MeetingPoint, PointKind } from '../types'
import { formatDate } from '../lib/format'
import { track } from '../lib/unsaved'
import SaveIndicator from './SaveIndicator'
import MeetingDetail from './MeetingDetail'
import NewMeetingModal from './NewMeetingModal'

interface Props {
  repo: Repo
  userEmail: string | null
  onSignOut?: () => void
}

export default function Workspace({ repo, userEmail, onSignOut }: Props) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [points, setPoints] = useState<MeetingPoint[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const fail = useCallback((err: unknown) => {
    console.error(err)
    setToast(err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Erro ao salvar')
    setTimeout(() => setToast(null), 5000)
  }, [])

  useEffect(() => {
    Promise.all([repo.listMeetings(), repo.listPoints()])
      .then(([m, p]) => {
        setMeetings(m)
        setPoints(p)
        setSelectedId(m[0]?.id ?? null)
      })
      .catch(fail)
      .finally(() => setLoading(false))
  }, [repo, fail])

  // Atalho: "N" cria nova reunião
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey) return
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setCreating(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, { positive: number; negative: number }> = {}
    for (const p of points) {
      c[p.meeting_id] ??= { positive: 0, negative: 0 }
      c[p.meeting_id][p.kind]++
    }
    return c
  }, [points])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return meetings
    return meetings.filter(m => m.title.toLowerCase().includes(q))
  }, [meetings, query])

  const selected = meetings.find(m => m.id === selectedId) ?? null

  async function createMeeting(input: MeetingInput) {
    try {
      const m = await track(repo.createMeeting(input))
      setMeetings(prev => [m, ...prev].sort((a, b) => b.meeting_date.localeCompare(a.meeting_date) || b.created_at.localeCompare(a.created_at)))
      setSelectedId(m.id)
      setCreating(false)
    } catch (e) {
      fail(e)
    }
  }

  async function updateMeeting(id: string, patch: MeetingPatch) {
    const before = meetings
    setMeetings(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)))
    try {
      await track(repo.updateMeeting(id, patch))
    } catch (e) {
      setMeetings(before)
      fail(e)
    }
  }

  async function deleteMeeting(id: string) {
    const m = meetings.find(x => x.id === id)
    if (!m || !confirm(`Excluir a reunião "${m.title}" e todas as anotações dela?`)) return
    try {
      await track(repo.deleteMeeting(id))
      const rest = meetings.filter(x => x.id !== id)
      setMeetings(rest)
      setPoints(prev => prev.filter(p => p.meeting_id !== id))
      setSelectedId(rest[0]?.id ?? null)
    } catch (e) {
      fail(e)
    }
  }

  async function addPoint(meetingId: string, kind: PointKind, content: string) {
    try {
      const p = await track(repo.addPoint(meetingId, kind, content))
      setPoints(prev => [...prev, p])
    } catch (e) {
      fail(e)
    }
  }

  async function updatePoint(id: string, content: string) {
    const before = points
    setPoints(prev => prev.map(p => (p.id === id ? { ...p, content } : p)))
    try {
      await track(repo.updatePoint(id, content))
    } catch (e) {
      setPoints(before)
      fail(e)
    }
  }

  async function deletePoint(id: string) {
    const before = points
    setPoints(prev => prev.filter(p => p.id !== id))
    try {
      await track(repo.deletePoint(id))
    } catch (e) {
      setPoints(before)
      fail(e)
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="brand">
            <span className="brand-mark">◆</span> Closer Lab
          </div>
          <SaveIndicator />
          <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)} title="Nova reunião (N)">
            + Nova
          </button>
        </div>

        <input className="search" placeholder="Buscar reunião…" value={query} onChange={e => setQuery(e.target.value)} />

        <nav className="meeting-list">
          {loading && <div className="muted pad">Carregando…</div>}
          {!loading && filtered.length === 0 && (
            <div className="muted pad">{meetings.length ? 'Nenhuma reunião encontrada.' : 'Nenhuma reunião ainda.'}</div>
          )}
          {filtered.map(m => {
            const c = counts[m.id] ?? { positive: 0, negative: 0 }
            return (
              <button key={m.id} className={`meeting-item ${m.id === selectedId ? 'active' : ''}`} onClick={() => setSelectedId(m.id)}>
                <span className="meeting-item-title">{m.title}</span>
                <span className="meeting-item-meta">
                  <span>{formatDate(m.meeting_date)}</span>
                  <span className="counts">
                    <span className="count pos">+{c.positive}</span>
                    <span className="count neg">−{c.negative}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-foot">
          {userEmail ? (
            <>
              <span className="muted ellipsis" title={userEmail}>{userEmail}</span>
              <button className="link-btn" onClick={onSignOut}>Sair</button>
            </>
          ) : (
            <span className="warn-text" title="Configure o Supabase no arquivo .env para salvar na nuvem">
              ● Modo local (dados só neste navegador)
            </span>
          )}
        </div>
      </aside>

      <main className="main">
        {selected ? (
          <MeetingDetail
            key={selected.id}
            meeting={selected}
            points={points.filter(p => p.meeting_id === selected.id)}
            onUpdate={patch => updateMeeting(selected.id, patch)}
            onDelete={() => deleteMeeting(selected.id)}
            onAddPoint={(kind, content) => addPoint(selected.id, kind, content)}
            onUpdatePoint={updatePoint}
            onDeletePoint={deletePoint}
          />
        ) : (
          !loading && (
            <div className="empty">
              <div className="empty-icon">◆</div>
              <h2>Registre sua primeira reunião</h2>
              <p className="muted">Anote o que funcionou e o que precisa melhorar em cada call. É assim que o Closer evolui.</p>
              <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nova reunião</button>
            </div>
          )
        )}
      </main>

      {creating && <NewMeetingModal onCancel={() => setCreating(false)} onCreate={createMeeting} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
