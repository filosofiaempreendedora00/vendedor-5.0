import { createContext, useContext, useEffect, useRef } from 'react'
import type { NodeKind, PNode } from '../types'
import { childBase, numberChildren, parseLinks } from '../lib/playbook'

export interface PlaybookCtx {
  mode: 'use' | 'edit'
  collapsed: Set<string>
  toggleCollapse: (id: string) => void
  checked: Set<string>
  toggleCheck: (id: string) => void
  focusId: string | null
  clearFocus: () => void
  onText: (id: string, text: string) => void
  onKind: (id: string, kind: NodeKind) => void
  onEnter: (node: PNode) => void
  onIndent: (id: string, out: boolean) => void
  onMove: (id: string, dir: -1 | 1) => void
  onRemove: (id: string, viaBackspace: boolean) => void
  onAddChild: (id: string) => void
}

export const Ctx = createContext<PlaybookCtx>(null!)

const KINDS: { kind: NodeKind; label: string; title: string }[] = [
  { kind: 'item', label: '•', title: 'Etapa (numerada)' },
  { kind: 'example', label: '“”', title: 'Exemplo de fala / pergunta' },
  { kind: 'note', label: '✎', title: 'Observação' },
  { kind: 'check', label: '☐', title: 'Checklist' },
]

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
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}

const PLACEHOLDER: Record<NodeKind, string> = {
  item: 'Etapa…',
  example: 'Exemplo de fala ou pergunta…',
  note: 'Observação…',
  check: 'Item do checklist…',
}

interface Props {
  node: PNode
  depth: number
  num?: string
}

export function NodeList({ nodes, depth, parentNum, prefix }: { nodes: PNode[]; depth: number; parentNum: string | null; prefix: 'P' | '' }) {
  const nums = numberChildren(nodes, parentNum, prefix)
  return (
    <>
      {nodes.map(n => (
        <PlaybookNode key={n.id} node={n} depth={depth} num={nums.get(n.id)} />
      ))}
    </>
  )
}

export default function PlaybookNode({ node, depth, num }: Props) {
  const c = useContext(Ctx)
  const ref = useRef<HTMLTextAreaElement>(null)
  const editing = c.mode === 'edit'
  const hasKids = node.children.length > 0
  const isCollapsed = c.collapsed.has(node.id)
  const isChecked = c.checked.has(node.id)

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

  const tools = editing && (
    <span className="pn-tools">
      {KINDS.map(k => (
        <button
          key={k.kind}
          className={`pn-tool ${node.kind === k.kind ? 'on' : ''}`}
          title={k.title}
          onMouseDown={e => e.preventDefault()}
          onClick={() => c.onKind(node.id, k.kind)}
        >
          {k.label}
        </button>
      ))}
      {node.kind === 'item' && (
        <button className="pn-tool" title="Adicionar subitem" onMouseDown={e => e.preventDefault()} onClick={() => c.onAddChild(node.id)}>
          ＋
        </button>
      )}
      <button className="pn-tool danger" title="Excluir" onMouseDown={e => e.preventDefault()} onClick={() => c.onRemove(node.id, false)}>
        ×
      </button>
    </span>
  )

  if (node.kind !== 'item') {
    const checkbox = node.kind === 'check' && (
      <button
        className={`pn-box ${isChecked ? 'on' : ''}`}
        role="checkbox"
        aria-checked={isChecked}
        onClick={() => c.toggleCheck(node.id)}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 8.5 6.5 12 13 4.5" />
        </svg>
      </button>
    )
    return (
      <div id={`pn-${node.id}`} className={`pn pn-${node.kind} ${isChecked ? 'is-checked' : ''}`}>
        {checkbox}
        {body}
        {tools}
      </div>
    )
  }

  return (
    <div id={`pn-${node.id}`} className={`pn-item d${Math.min(depth, 5)} ${isCollapsed ? 'collapsed' : ''}`}>
      <div
        className={`pn-row ${hasKids ? 'toggle' : ''}`}
        onClick={() => !editing && hasKids && c.toggleCollapse(node.id)}
      >
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
        {tools}
      </div>
      {hasKids && !isCollapsed && (
        <div className="pn-children">
          <NodeList nodes={node.children} depth={depth + 1} parentNum={childBase(num ?? '')} prefix="" />
        </div>
      )}
    </div>
  )
}
