import { useEffect, useState } from 'react'
import type { Meeting, MeetingPatch, MeetingPoint, PointKind } from '../types'
import { normalizeUrl } from '../lib/format'
import PointColumn from './PointColumn'

interface Props {
  meeting: Meeting
  points: MeetingPoint[]
  onUpdate: (patch: MeetingPatch) => void
  onDelete: () => void
  onAddPoint: (kind: PointKind, content: string) => Promise<void>
  onUpdatePoint: (id: string, content: string) => void
  onDeletePoint: (id: string) => void
}

export default function MeetingDetail({ meeting, points, onUpdate, onDelete, onAddPoint, onUpdatePoint, onDeletePoint }: Props) {
  const [title, setTitle] = useState(meeting.title)
  const [url, setUrl] = useState(meeting.url ?? '')
  const [notes, setNotes] = useState(meeting.notes)

  // Salva as notas automaticamente após uma pausa na digitação
  useEffect(() => {
    if (notes === meeting.notes) return
    const t = setTimeout(() => onUpdate({ notes }), 800)
    return () => clearTimeout(t)
  }, [notes]) // eslint-disable-line react-hooks/exhaustive-deps

  function saveTitle() {
    const v = title.trim()
    if (!v) return setTitle(meeting.title)
    if (v !== meeting.title) onUpdate({ title: v })
  }

  function saveUrl() {
    const v = normalizeUrl(url)
    setUrl(v ?? '')
    if (v !== meeting.url) onUpdate({ url: v })
  }

  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && e.currentTarget.blur()

  return (
    <div className="detail">
      <header className="detail-head">
        <input
          className="title-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={blurOnEnter}
          aria-label="Nome da reunião"
        />
        <div className="meta-row">
          <input
            type="date"
            className="chip-input"
            value={meeting.meeting_date}
            onChange={e => e.target.value && onUpdate({ meeting_date: e.target.value })}
            aria-label="Data"
          />
          <div className="url-field">
            <span className="url-icon">🔗</span>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onBlur={saveUrl}
              onKeyDown={blurOnEnter}
              placeholder="Cole o link da gravação"
              aria-label="Link"
            />
            {meeting.url && (
              <a className="btn btn-ghost btn-sm" href={meeting.url} target="_blank" rel="noreferrer">
                Abrir ↗
              </a>
            )}
          </div>
          <button className="btn btn-danger-ghost btn-sm" onClick={onDelete} title="Excluir reunião">
            Excluir
          </button>
        </div>
      </header>

      <section className="columns">
        {(['positive', 'negative'] as const).map(kind => (
          <PointColumn
            key={kind}
            kind={kind}
            points={points.filter(p => p.kind === kind)}
            onAdd={content => onAddPoint(kind, content)}
            onUpdate={onUpdatePoint}
            onDelete={onDeletePoint}
          />
        ))}
      </section>

      <section className="notes">
        <label htmlFor="notes">Principal aprendizado / o que farei diferente na próxima</label>
        <textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => notes !== meeting.notes && onUpdate({ notes })}
          placeholder="Ex.: Ancorar o preço antes de apresentar as condições de pagamento."
          rows={4}
        />
      </section>
    </div>
  )
}
