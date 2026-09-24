import { useEffect, useState } from 'react'

interface Props {
  onCancel: () => void
  onCreate: (title: string) => Promise<void>
}

export default function NewPromptModal({ onCancel, onCreate }: Props) {
  const [title, setTitle] = useState('')
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
    await onCreate(title.trim())
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={submit}>
        <h3>Novo prompt</h3>
        <label className="field">
          <span>Nome do prompt</span>
          <input autoFocus required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Análise de objeções da call" />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving || !title.trim()}>{saving ? 'Criando…' : 'Criar prompt'}</button>
        </div>
      </form>
    </div>
  )
}
