import { useEffect, useRef, useState } from 'react'
import type { Snippet, SnippetPart, SnippetPatch } from '../types'
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

const newPart = (label: string, text = ''): SnippetPart => ({ id: crypto.randomUUID(), label, text })

function CopyButton({ text, label, className = 'btn btn-ghost btn-sm' }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className={className}
      disabled={!text.trim()}
      onClick={async () => {
        await copyText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? 'Copiado ✓' : label}
    </button>
  )
}

export default function SnippetDetail({ config, snippet, categories, autoFocusContent, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(snippet.title)
  const [category, setCategory] = useState(snippet.category)
  const [content, setContent] = useState(snippet.content)
  const [parts, setParts] = useState<SnippetPart[]>(snippet.parts)
  const [focusPart, setFocusPart] = useState<string | null>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const multi = parts.length > 0
  const partsJson = JSON.stringify(parts)
  const partsChanged = partsJson !== JSON.stringify(snippet.parts)

  useDirty(title.trim() !== snippet.title || category.trim() !== snippet.category || content !== snippet.content || partsChanged)

  useEffect(() => {
    if (autoFocusContent) contentRef.current?.focus()
  }, [autoFocusContent])

  // Salva texto e partes automaticamente após uma pausa na digitação
  useEffect(() => {
    if (content === snippet.content) return
    const t = setTimeout(() => onUpdate({ content }), 400)
    return () => clearTimeout(t)
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!partsChanged) return
    const t = setTimeout(() => onUpdate({ parts }), 400)
    return () => clearTimeout(t)
  }, [partsJson]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const setPart = (id: string, patch: Partial<SnippetPart>) => setParts(ps => ps.map(p => (p.id === id ? { ...p, ...patch } : p)))
  const movePart = (i: number, dir: -1 | 1) =>
    setParts(ps => {
      const j = i + dir
      if (j < 0 || j >= ps.length) return ps
      const next = [...ps]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  function addPart() {
    const p = newPart(`Parte ${parts.length + 1}`)
    setParts(ps => [...ps, p])
    setFocusPart(p.id)
  }
  function removePart(p: SnippetPart) {
    if (p.text.trim() && !confirm(`Remover a parte "${p.label}"?`)) return
    setParts(ps => ps.filter(x => x.id !== p.id))
  }
  function splitIntoParts() {
    const first = newPart('Parte 1', content)
    const second = newPart('Parte 2')
    setParts([first, second])
    setFocusPart(second.id)
  }

  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && e.currentTarget.blur()
  const words = content.trim() ? content.trim().split(/\s+/).length : 0
  const edited = new Date(snippet.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

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
            {multi ? `${parts.length} partes` : `${content.length} caracteres · ${words} ${words === 1 ? 'palavra' : 'palavras'}`} · editado em {edited}
          </span>
          <span className="spacer" />
          <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>Excluir</button>
          {!multi && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={splitIntoParts} title="Para enquetes ou sequências de mensagens: cada parte com seu botão de copiar">
                Dividir em partes
              </button>
              <CopyButton text={content} label={config.copyLabel} className="btn btn-primary" />
            </>
          )}
        </div>
      </header>

      {multi ? (
        <div className="parts">
          {parts.map((p, i) => (
            <div key={p.id} className="part">
              <div className="part-head">
                <span className="part-num">{i + 1}</span>
                <input className="part-label" value={p.label} onChange={e => setPart(p.id, { label: e.target.value })} onKeyDown={blurOnEnter} aria-label="Nome da parte" />
                <span className="spacer" />
                <span className="part-tools">
                  <button className="pn-tool" title="Subir" disabled={i === 0} onClick={() => movePart(i, -1)}>↑</button>
                  <button className="pn-tool" title="Descer" disabled={i === parts.length - 1} onClick={() => movePart(i, 1)}>↓</button>
                  <button className="pn-tool danger" title="Remover parte" onClick={() => removePart(p)}>×</button>
                </span>
                <CopyButton text={p.text} label="Copiar" className="btn btn-primary btn-sm" />
              </div>
              <textarea
                className="part-text"
                rows={1}
                value={p.text}
                autoFocus={focusPart === p.id}
                onChange={e => setPart(p.id, { text: e.target.value })}
                placeholder="Texto desta parte…"
              />
            </div>
          ))}
          <button className="pb-add" onClick={addPart}>+ Adicionar parte</button>
        </div>
      ) : (
        <textarea
          ref={contentRef}
          className={`snippet-editor ${config.mono ? 'mono-editor' : ''}`}
          value={content}
          onChange={e => setContent(e.target.value)}
          onBlur={() => content !== snippet.content && onUpdate({ content })}
          placeholder={config.editorPlaceholder}
          spellCheck={!config.mono}
        />
      )}
    </div>
  )
}
