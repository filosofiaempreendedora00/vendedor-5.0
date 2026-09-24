import { useEffect, useState } from 'react'
import type { MeetingInput } from '../types'
import { normalizeUrl, todayISO } from '../lib/format'

interface Props {
  onCancel: () => void
  onCreate: (input: MeetingInput) => Promise<void>
}

export default function NewMeetingModal({ onCancel, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onCreate({ title: title.trim(), url: normalizeUrl(url), meeting_date: date })
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={submit}>
        <h3>Nova reunião</h3>
        <label className="field">
          <span>Nome da reunião</span>
          <input autoFocus required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Call de fechamento — Empresa X" />
        </label>
        <label className="field">
          <span>Link da gravação</span>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" />
        </label>
        <label className="field">
          <span>Data</span>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving || !title.trim()}>{saving ? 'Criando…' : 'Criar reunião'}</button>
        </div>
      </form>
    </div>
  )
}
