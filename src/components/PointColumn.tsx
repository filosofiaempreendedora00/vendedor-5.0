import { useRef, useState } from 'react'
import type { MeetingPoint, PointKind } from '../types'
import { useDirty } from '../lib/unsaved'

const LABELS: Record<PointKind, { title: string; icon: string; placeholder: string }> = {
  positive: { title: 'Pontos positivos', icon: '▲', placeholder: 'O que funcionou bem? (Enter para adicionar)' },
  negative: { title: 'Pontos a melhorar', icon: '▼', placeholder: 'O que poderia ter sido melhor? (Enter para adicionar)' },
}

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
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const l = LABELS[kind]
  useDirty(draft.trim() !== '')

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
    <div className={`column column-${kind}`}>
      <div className="column-head">
        <span className="column-icon">{l.icon}</span>
        <h3>{l.title}</h3>
        <span className="column-count">{points.length}</span>
      </div>

      <ul className="point-list">
        {points.map(p => (
          <PointItem key={p.id} point={p} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </ul>

      <div className="point-add-wrap">
      <textarea
        ref={inputRef}
        className="point-add"
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
      {draft.trim() && (
        <button className="point-add-btn" onMouseDown={e => e.preventDefault()} onClick={() => add()}>
          Adicionar ↵
        </button>
      )}
      </div>
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
      {editing ? (
        <textarea
          autoFocus
          className="point-edit"
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
