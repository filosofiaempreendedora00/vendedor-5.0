import { useEffect, useState } from 'react'
import type { LibraryConfig } from '../lib/libraries'

interface Props {
  config: LibraryConfig
  categories: string[]
  initialCategory?: string
  onCancel: () => void
  onCreate: (title: string, category: string) => Promise<void>
}

export default function NewSnippetModal({ config, categories, initialCategory = '', onCancel, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(initialCategory)
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
    await onCreate(title.trim(), category.trim())
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={submit}>
        <h3>{config.newLabel}</h3>
        <label className="field">
          <span>Nome</span>
          <input autoFocus required value={title} onChange={e => setTitle(e.target.value)} placeholder={config.namePlaceholder} />
        </label>
        <label className="field">
          <span>{config.stages ? 'Etapa / categoria' : 'Categoria (opcional)'}</span>
          <input list="new-snippet-categories" value={category} onChange={e => setCategory(e.target.value)} placeholder="Escolha ou digite uma nova" />
          <datalist id="new-snippet-categories">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" disabled={saving || !title.trim()}>{saving ? 'Criando…' : 'Criar'}</button>
        </div>
      </form>
    </div>
  )
}
