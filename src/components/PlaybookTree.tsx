import type { ReactNode } from 'react'
import type { MergedDoc } from '../lib/overlay'
import * as pb from '../lib/playbook'
import PlaybookNode, { Ctx, type PlaybookCtx } from './PlaybookNode'

interface Props {
  doc: MergedDoc
  ctx: PlaybookCtx
  modeLabels: [string, string]
  onMode: (m: 'use' | 'edit') => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onAddToSection: (sectionId: string) => void
  controls?: ReactNode
  editHelp?: ReactNode
}

/** Árvore do processo (modelo ou roteiro de cliente) com bandas de seção e controles. */
export default function PlaybookTree({ doc, ctx, modeLabels, onMode, onExpandAll, onCollapseAll, onAddToSection, controls, editHelp }: Props) {
  const meeting = doc.sections.find(s => s.id === 'meeting')
  const meetingBlocks = meeting?.nodes.filter(n => n.kind === 'item').length ?? 0

  return (
    <Ctx.Provider value={ctx}>
      <div className={`pb-controls mode-${ctx.mode}`}>
        <div className="segmented">
          <button className={ctx.mode === 'use' ? 'on' : ''} onClick={() => onMode('use')}>{modeLabels[0]}</button>
          <button className={ctx.mode === 'edit' ? 'on' : ''} onClick={() => onMode('edit')}>{modeLabels[1]}</button>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onExpandAll}>Expandir tudo</button>
        <button className="btn btn-ghost btn-sm" onClick={onCollapseAll}>Recolher tudo</button>
        <span className="spacer" />
        {controls}
      </div>

      {ctx.mode === 'edit' && (
        <p className="pb-help">
          <kbd>Enter</kbd> novo item · <kbd>Tab</kbd> / <kbd>⇧ Tab</kbd> muda o nível · <kbd>⌥ ↑↓</kbd> reordena · <kbd>⌫</kbd> em linha vazia apaga ·
          links: <code>[texto](https://…)</code>
          {editHelp}
        </p>
      )}

      <div className={`pb-body mode-${ctx.mode}`}>
        {doc.sections.map(s => {
          const open = !ctx.collapsed.has(s.id)
          const nums = pb.numberChildren(s.nodes, null, s.id === 'prep' ? 'P' : '')
          let block = 0
          return (
            <section key={s.id} className={`pb-section pb-${s.id}`}>
              <button className="pb-band" aria-expanded={open} onClick={() => ctx.toggleCollapse(s.id)}>
                <span className="pb-band-chev">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 7.5 10 12.5 15 7.5" />
                  </svg>
                </span>
                <span className="pb-band-name">{s.title}</span>
                <span className="pb-band-meta">{s.id === 'prep' ? `${s.nodes.length} itens` : `01 → ${String(meetingBlocks).padStart(2, '0')}`}</span>
                <span className="pb-band-rule" />
              </button>
              {open && (
                <div className="pb-tree">
                  {s.nodes.map(n => {
                    const color = s.id === 'prep' ? 'var(--muted)' : pb.BLOCK_COLORS[(n.kind === 'item' ? block++ : Math.max(block - 1, 0)) % pb.BLOCK_COLORS.length]
                    return (
                      <div key={n.id} className="pb-block" style={{ ['--c' as string]: color }}>
                        <PlaybookNode node={n} depth={1} num={nums.get(n.id)} />
                      </div>
                    )
                  })}
                  {ctx.mode === 'edit' && (
                    <button className="pb-add" onClick={() => onAddToSection(s.id)}>
                      + Adicionar {s.id === 'prep' ? 'item de preparação' : 'bloco'}
                    </button>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
