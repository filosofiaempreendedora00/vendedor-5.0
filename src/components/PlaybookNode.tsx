import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { NodeKind } from '../types'
import type { MNode } from '../lib/overlay'
import { childBase, numberChildren, parseLinks } from '../lib/playbook'

export interface PlaybookCtx {
  mode: 'use' | 'edit'
  /** Roteiro de cliente (modelo + personalizações) em vez do modelo. */
  client: boolean
  collapsed: Set<string>
  toggleCollapse: (id: string) => void
  checked: Set<string>
  toggleCheck: (id: string) => void
  answers: Record<string, string>
  onAnswer: (id: string, text: string) => void
  focusId: string | null
  clearFocus: () => void
  onText: (id: string, text: string) => void
  onKind: (id: string, kind: NodeKind) => void
  onEnter: (node: MNode) => void
  onIndent: (id: string, out: boolean) => void
  onMove: (id: string, dir: -1 | 1) => void
  onRemove: (id: string, viaBackspace: boolean) => void
  onAddChild: (id: string) => void
  onRevert: (id: string) => void
}

export const Ctx = createContext<PlaybookCtx>(null!)

const KINDS: { kind: NodeKind; label: string; title: string }[] = [
  { kind: 'item', label: '•', title: 'Etapa (numerada)' },
  { kind: 'example', label: '“”', title: 'Exemplo de fala / pergunta' },
  { kind: 'note', label: '✎', title: 'Observação' },
  { kind: 'check', label: '☐', title: 'Checklist' },
]

const PLACEHOLDER: Record<NodeKind, string> = {
  item: 'Etapa…',
  example: 'Exemplo de fala ou pergunta…',
  note: 'Observação…',
  check: 'Item do checklist…',
}

const Chevron = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 7.5 10 12.5 15 7.5" />
  </svg>
)

function RichText({ text, placeholder }: { text: string; placeholder: string }) {
  if (!text.trim()) return <span className="pn-placeholder">{placeholder}</span>
  return (
    <>
      {parseLinks(text).map((p, i) =>
        'href' in p ? (
          <a key={i} href={p.href} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{p.text}</a>
        ) : 'keyword' in p ? (
          <mark key={i} className="pn-kw">{p.text}</mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}

export function NodeList({ nodes, depth, parentNum, prefix }: { nodes: MNode[]; depth: number; parentNum: string | null; prefix: 'P' | '' }) {
  const nums = numberChildren(nodes, parentNum, prefix)
  return (
    <>
      {nodes.map(n => (
        <PlaybookNode key={n.id} node={n} depth={depth} num={nums.get(n.id)} />
      ))}
    </>
  )
}

function Answer({ id, open, onClose }: { id: string; open: boolean; onClose: () => void }) {
  const c = useContext(Ctx)
  const value = c.answers[id] ?? ''
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (open && !value) ref.current?.focus()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!open && !value) return null
  return (
    <div className="pn-answer">
      <span className="pn-answer-label">Anotação</span>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        placeholder="O que o cliente respondeu, o que você percebeu…"
        onChange={e => c.onAnswer(id, e.target.value)}
        onBlur={() => !value.trim() && onClose()}
      />
    </div>
  )
}

export default function PlaybookNode({ node, depth, num }: { node: MNode; depth: number; num?: string }) {
  const c = useContext(Ctx)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [annotating, setAnnotating] = useState(false)
  const editing = c.mode === 'edit'
  const hasKids = node.children.length > 0
  const isCollapsed = c.collapsed.has(node.id)
  const isChecked = c.checked.has(node.id)
  const checkable = node.kind === 'check' || (c.client && node.kind === 'example')

  useEffect(() => {
    if (editing && c.focusId === node.id && ref.current) {
      const el = ref.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      c.clearFocus()
    }
  }, [c.focusId, editing]) // eslint-disable-line react-hooks/exhaustive-deps

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      c.onEnter(node)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      c.onIndent(node.id, e.shiftKey)
    } else if (e.key === 'Backspace' && node.text === '' && !hasKids) {
      e.preventDefault()
      c.onRemove(node.id, true)
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      c.onMove(node.id, e.key === 'ArrowUp' ? -1 : 1)
    } else if (e.key === 'Escape') {
      e.currentTarget.blur()
    }
  }

  const body = editing ? (
    <textarea
      ref={ref}
      className="pn-input"
      rows={1}
      value={node.text}
      placeholder={PLACEHOLDER[node.kind]}
      onChange={e => c.onText(node.id, e.target.value)}
      onKeyDown={onKeyDown}
    />
  ) : (
    <span className="pn-text">
      <RichText text={node.text} placeholder={PLACEHOLDER[node.kind]} />
    </span>
  )

  const keep = (e: React.MouseEvent) => e.preventDefault()
  const tag = c.client && (node.origin === 'custom' ? <span className="pn-tag custom">cliente</span> : node.overridden ? <span className="pn-tag edited">editado</span> : null)
  const tools = (
    <span className="pn-tools">
      {c.client && node.kind !== 'note' && (
        <button className="pn-tool wide" title="Anotar o que aconteceu neste ponto" onMouseDown={keep} onClick={() => setAnnotating(true)}>
          anotar
        </button>
      )}
      {editing && (
        <>
          {KINDS.map(k => (
            <button key={k.kind} className={`pn-tool ${node.kind === k.kind ? 'on' : ''}`} title={k.title} onMouseDown={keep} onClick={() => c.onKind(node.id, k.kind)}>
              {k.label}
            </button>
          ))}
          {node.kind === 'item' && (
            <button className="pn-tool" title="Adicionar subitem" onMouseDown={keep} onClick={() => c.onAddChild(node.id)}>
              ＋
            </button>
          )}
          {node.overridden && (
            <button className="pn-tool" title="Voltar ao texto do modelo" onMouseDown={keep} onClick={() => c.onRevert(node.id)}>
              ↺
            </button>
          )}
          <button
            className="pn-tool danger"
            title={c.client && node.origin === 'master' ? 'Ocultar neste cliente' : 'Excluir'}
            onMouseDown={keep}
            onClick={() => c.onRemove(node.id, false)}
          >
            ×
          </button>
        </>
      )}
    </span>
  )
  const originClass = c.client ? `is-${node.origin}${node.overridden ? ' is-overridden' : ''}` : ''

  if (node.kind !== 'item') {
    return (
      <div id={`pn-${node.id}`} className={`pn-wrap ${originClass}`}>
        <div className={`pn pn-${node.kind} ${isChecked ? 'is-checked' : ''}`}>
          {checkable && (
            <button
              className={`pn-box ${isChecked ? 'on' : ''}`}
              role="checkbox"
              aria-checked={isChecked}
              title={node.kind === 'example' ? 'Marcar como perguntado' : undefined}
              onClick={() => c.toggleCheck(node.id)}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 8.5 6.5 12 13 4.5" />
              </svg>
            </button>
          )}
          {body}
          {tag}
          {tools}
        </div>
        {c.client && <Answer id={node.id} open={annotating} onClose={() => setAnnotating(false)} />}
      </div>
    )
  }

  return (
    <div id={`pn-${node.id}`} className={`pn-item d${Math.min(depth, 5)} ${isCollapsed ? 'collapsed' : ''} ${originClass}`}>
      <div className={`pn-row ${hasKids ? 'toggle' : ''}`} onClick={() => !editing && hasKids && c.toggleCollapse(node.id)}>
        <span className="pn-num">{num}</span>
        <button
          className="pn-chev"
          tabIndex={hasKids ? 0 : -1}
          style={{ visibility: hasKids ? 'visible' : 'hidden' }}
          onClick={e => {
            e.stopPropagation()
            c.toggleCollapse(node.id)
          }}
          aria-label={isCollapsed ? 'Expandir' : 'Recolher'}
        >
          <Chevron />
        </button>
        {body}
        {tag || <span />}
        {tools}
      </div>
      {c.client && (
        <div className="pn-answer-slot">
          <Answer id={node.id} open={annotating} onClose={() => setAnnotating(false)} />
        </div>
      )}
      {hasKids && !isCollapsed && (
        <div className="pn-children">
          <NodeList nodes={node.children} depth={depth + 1} parentNum={childBase(num ?? '')} prefix="" />
        </div>
      )}
    </div>
  )
}
