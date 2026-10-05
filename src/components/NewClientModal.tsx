import { useEffect, useState } from 'react'
import { todayISO } from '../lib/format'

interface Props {
  onCancel: () => void
  onCreate: (input: { name: string; company: string; meeting_date: string }) => Promise<void>
}

export default function NewClientModal({ onCancel, onCreate }: Props) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onCreate({ name: name.trim(), company: company.trim(), meeting_date: date })
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={submit}>
        <h3>Novo roteiro de cliente</h3>
        <p className="muted small" style={{ margin: 0 }}>
          Começa como cópia do processo padrão. O que você personalizar fica só neste cliente; o que mudar no modelo aparece aqui também.
        </p>
        <label className="field">
          <span>Nome do cliente</span>
          <input autoFocus required value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Mariana Souza" />
        </label>
        <label className="field">
          <span>Empresa</span>
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Ex.: Acme Odontologia" />
        </label>
        <label className="field">
          <span>Data da reunião</span>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving || !name.trim()}>{saving ? 'Criando…' : 'Criar roteiro'}</button>
        </div>
      </form>
    </div>
  )
}
