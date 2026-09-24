import { useRef, useState } from 'react'
import type { MeetingPoint, PointKind } from '../types'
import { useDirty } from '../lib/unsaved'

const LABELS: Record<PointKind, { title: string; sign: string; placeholder: string }> = {
  positive: { title: 'Pontos positivos', sign: '+', placeholder: 'Adicionar ponto positivo…' },
  negative: { title: 'Pontos negativos', sign: '−', placeholder: 'Adicionar ponto negativo…' },
}

const collapseKey = (kind: PointKind) => `closer-lab:collapsed:${kind}`

interface Props {
  kind: PointKind
  points: MeetingPoint[]
  onAdd: (content: string) => Promise<void>
  onUpdate: (id: string, content: string) => void
  onDelete: (id: string) => void
}

export default function PointColumn({ kind, points, onAdd, onUpdate, onDelete }: Props) {
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(collapseKey(kind)) === '1' } catch { return false }
  })
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const l = LABELS[kind]
  useDirty(draft.trim() !== '')

  function toggle() {
    setCollapsed(c => {
      try { localStorage.setItem(collapseKey(kind), c ? '0' : '1') } catch { /* ignora */ }
      return !c
    })
  }

  async function add(refocus = true) {
    const v = draft.trim()
    if (!v || adding) return
    setAdding(true)
    await onAdd(v)
    setDraft('')
    setAdding(false)
    if (refocus) inputRef.current?.focus()
  }

  return (
    <div className={`column column-${kind} ${collapsed ? 'collapsed' : ''}`}>
      <button className="column-head" onClick={toggle} aria-expanded={!collapsed}>
        <span className="column-sign">{l.sign}</span>
        <h3>{l.title}</h3>
        <span className="column-count">{points.length}</span>
        <span className="chevron" aria-hidden>▾</span>
      </button>

      {!collapsed && (
        <div className="column-body">
          <ul className="point-list">
            {points.map(p => (
              <PointItem key={p.id} point={p} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
            <li className="point point-new">
              <span className="bullet" />
              <textarea
                ref={inputRef}
                className="point-input"
                rows={1}
                value={draft}
                placeholder={l.placeholder}
                disabled={adding}
                onChange={e => setDraft(e.target.value)}
                onBlur={() => add(false)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    add()
                  }
                }}
              />
              {draft.trim() && <kbd className="enter-hint">Enter ↵</kbd>}
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

function PointItem({ point, onUpdate, onDelete }: { point: MeetingPoint; onUpdate: Props['onUpdate']; onDelete: Props['onDelete'] }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(point.content)
  useDirty(editing && value.trim() !== point.content)

  function commit() {
    setEditing(false)
    const v = value.trim()
    if (!v) return setValue(point.content)
    if (v !== point.content) onUpdate(point.id, v)
  }

  return (
    <li className="point">
      <span className="bullet" />
      {editing ? (
        <textarea
          autoFocus
          className="point-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={commit}
          onFocus={e => e.currentTarget.setSelectionRange(value.length, value.length)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') {
              setValue(point.content)
              setEditing(false)
            }
          }}
        />
      ) : (
        <p className="point-text" onClick={() => setEditing(true)} title="Clique para editar">
          {point.content}
        </p>
      )}
      <button className="point-del" onClick={() => onDelete(point.id)} aria-label="Remover">
        ×
      </button>
    </li>
  )
}
