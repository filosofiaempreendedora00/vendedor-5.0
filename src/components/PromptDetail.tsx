import { useEffect, useRef, useState } from 'react'
import type { Prompt, PromptPatch } from '../types'
import { useDirty } from '../lib/unsaved'

interface Props {
  prompt: Prompt
  autoFocusContent: boolean
  onUpdate: (patch: PromptPatch) => void
  onDelete: () => void
}

export default function PromptDetail({ prompt, autoFocusContent, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(prompt.title)
  const [content, setContent] = useState(prompt.content)
  const [copied, setCopied] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  useDirty(title.trim() !== prompt.title || content !== prompt.content)

  useEffect(() => {
    if (autoFocusContent) contentRef.current?.focus()
  }, [autoFocusContent])

  // Salva o texto automaticamente após uma pausa na digitação
  useEffect(() => {
    if (content === prompt.content) return
    const t = setTimeout(() => onUpdate({ content }), 400)
    return () => clearTimeout(t)
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  function saveTitle() {
    const v = title.trim()
    if (!v) return setTitle(prompt.title)
    if (v !== prompt.title) onUpdate({ title: v })
  }

  async function copy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const words = content.trim() ? content.trim().split(/\s+/).length : 0

  return (
    <div className="detail prompt-detail">
      <header className="detail-head">
        <input
          className="title-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label="Nome do prompt"
        />
        <div className="meta-row">
          <button className="btn btn-primary btn-sm" onClick={copy} disabled={!content.trim()}>
            {copied ? 'Copiado ✓' : 'Copiar prompt'}
          </button>
          <span className="muted small">
            {words} {words === 1 ? 'palavra' : 'palavras'} · editado em {new Date(prompt.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
          <span className="spacer" />
          <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>Excluir</button>
        </div>
      </header>

      <textarea
        ref={contentRef}
        className="prompt-editor"
        value={content}
        onChange={e => setContent(e.target.value)}
        onBlur={() => content !== prompt.content && onUpdate({ content })}
        placeholder="Escreva ou cole o prompt aqui…"
        spellCheck={false}
      />
    </div>
  )
}
