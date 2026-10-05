import { useEffect, useRef, useState } from 'react'
import type { Snippet, SnippetPatch } from '../types'
import { copyText, type LibraryConfig } from '../lib/libraries'
import { useDirty } from '../lib/unsaved'

interface Props {
  config: LibraryConfig
  snippet: Snippet
  categories: string[]
  autoFocusContent: boolean
  onUpdate: (patch: SnippetPatch) => void
  onDelete: () => void
}

export default function SnippetDetail({ config, snippet, categories, autoFocusContent, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(snippet.title)
  const [category, setCategory] = useState(snippet.category)
  const [content, setContent] = useState(snippet.content)
  const [copied, setCopied] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  useDirty(title.trim() !== snippet.title || category.trim() !== snippet.category || content !== snippet.content)

  useEffect(() => {
    if (autoFocusContent) contentRef.current?.focus()
  }, [autoFocusContent])

  // Salva o texto automaticamente após uma pausa na digitação
  useEffect(() => {
    if (content === snippet.content) return
    const t = setTimeout(() => onUpdate({ content }), 400)
    return () => clearTimeout(t)
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  function saveTitle() {
    const v = title.trim()
    if (!v) return setTitle(snippet.title)
    if (v !== snippet.title) onUpdate({ title: v })
  }

  function saveCategory() {
    const v = category.trim()
    setCategory(v)
    if (v !== snippet.category) onUpdate({ category: v })
  }

  async function copy() {
    await copyText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && e.currentTarget.blur()
  const words = content.trim() ? content.trim().split(/\s+/).length : 0

  return (
    <div className="detail snippet-detail">
      <header className="detail-head">
        <input className="title-input" value={title} onChange={e => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={blurOnEnter} aria-label="Nome" />
        <div className="meta-row">
          <label className="category-field">
            <span className="category-icon">#</span>
            <input
              list="snippet-categories"
              value={category}
              onChange={e => setCategory(e.target.value)}
              onBlur={saveCategory}
              onKeyDown={blurOnEnter}
              placeholder="Sem categoria"
              aria-label="Categoria"
            />
            <datalist id="snippet-categories">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </label>
          <span className="muted small">
            {content.length} caracteres · {words} {words === 1 ? 'palavra' : 'palavras'} · editado em{' '}
            {new Date(snippet.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
          <span className="spacer" />
          <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>Excluir</button>
          <button className="btn btn-primary" onClick={copy} disabled={!content.trim()}>
            {copied ? 'Copiado ✓' : config.copyLabel}
          </button>
        </div>
      </header>

      <textarea
        ref={contentRef}
        className={`snippet-editor ${config.mono ? 'mono-editor' : ''}`}
        value={content}
        onChange={e => setContent(e.target.value)}
        onBlur={() => content !== snippet.content && onUpdate({ content })}
        placeholder={config.editorPlaceholder}
        spellCheck={!config.mono}
      />
    </div>
  )
}
