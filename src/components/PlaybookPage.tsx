import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Repo } from '../lib/repo'
import type { NodeKind, PNode, PlaybookDoc, PlaybookVersion } from '../types'
import * as pb from '../lib/playbook'
import { track, useDirty } from '../lib/unsaved'
import { useToast } from '../lib/useToast'
import Layout, { type ShellProps } from './Layout'
import PlaybookNode, { Ctx, type PlaybookCtx } from './PlaybookNode'
import VersionsModal from './VersionsModal'

interface Props extends ShellProps {
  repo: Repo
}

const COLLAPSE_KEY = 'closer-lab:playbook-collapsed'

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    return new Set(raw ? JSON.parse(raw) : ['prep'])
  } catch {
    return new Set(['prep'])
  }
}

function nextVersionLabel(versions: PlaybookVersion[]) {
  const nums = versions.map(v => Number(v.label.match(/^v(\d+)/i)?.[1] ?? 0))
  return `v${Math.max(0, ...nums) + 1}`
}

export default function PlaybookPage({ repo, ...shell }: Props) {
  const [doc, setDoc] = useState<PlaybookDoc | null>(null)
  const [savedJson, setSavedJson] = useState('')
  const [versions, setVersions] = useState<PlaybookVersion[]>([])
  const [mode, setMode] = useState<'use' | 'edit'>('use')
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [focusId, setFocusId] = useState<string | null>(null)
  const [showVersions, setShowVersions] = useState(false)
  const [versionLabel, setVersionLabel] = useState<string | null>(null)
  const { toast, fail } = useToast()

  // Carrega; na primeira vez, importa o processo v11 (o ref evita rodar duas vezes)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    ;(async () => {
      let content = await repo.getPlaybook()
      let vs = await repo.listPlaybookVersions()
      if (!content) {
        content = pb.seedPlaybook()
        await track(repo.savePlaybook(content))
        vs = [await track(repo.createPlaybookVersion('v11 — importado do HTML', content))]
      }
      setDoc(content)
      setSavedJson(JSON.stringify(content))
      setVersions(vs)
    })().catch(fail)
  }, [repo, fail])

  const json = useMemo(() => (doc ? JSON.stringify(doc) : ''), [doc])
  useDirty(!!doc && json !== savedJson)

  // Salvamento automático
  useEffect(() => {
    if (!doc || json === savedJson) return
    const t = setTimeout(() => {
      track(repo.savePlaybook(doc))
        .then(() => setSavedJson(json))
        .catch(fail)
    }, 700)
    return () => clearTimeout(t)
  }, [json]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsed])) } catch { /* ignora */ }
  }, [collapsed])

  const apply = (fn: (d: PlaybookDoc) => PlaybookDoc) => setDoc(d => (d ? fn(d) : d))

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }, [])

  const ctx: PlaybookCtx = {
    mode,
    collapsed,
    toggleCollapse,
    checked,
    toggleCheck: id =>
      setChecked(prev => {
        const s = new Set(prev)
        s.has(id) ? s.delete(id) : s.add(id)
        return s
      }),
    focusId,
    clearFocus: () => setFocusId(null),
    onText: (id, text) => apply(d => pb.updateNode(d, id, { text })),
    onKind: (id, kind: NodeKind) => apply(d => pb.updateNode(d, id, { kind })),
    onEnter: (node: PNode) => {
      const n = pb.newNode(node.kind === 'item' ? 'item' : node.kind)
      apply(d => pb.insertAfter(d, node.id, n))
      setFocusId(n.id)
    },
    onIndent: (id, out) => {
      apply(d => (out ? pb.outdent(d, id) : pb.indent(d, id)))
      setFocusId(id)
    },
    onMove: (id, dir) => {
      apply(d => pb.move(d, id, dir))
      setFocusId(id)
    },
    onRemove: (id, viaBackspace) => {
      if (!doc) return
      const order = pb.visibleOrder(doc, collapsed)
      const prev = order[order.indexOf(id) - 1]
      if (!viaBackspace && !confirm('Excluir este item e tudo que estiver dentro dele?')) return
      apply(d => pb.removeNode(d, id))
      if (viaBackspace && prev) setFocusId(prev)
    },
    onAddChild: id => {
      const n = pb.newNode()
      apply(d => pb.appendChild(d, id, n))
      setCollapsed(prev => {
        const s = new Set(prev)
        s.delete(id)
        return s
      })
      setFocusId(n.id)
    },
  }

  const addBlock = useCallback(() => {
    const n = pb.newNode()
    setDoc(d => (d ? pb.appendToSection(d, 'meeting', n) : d))
    setCollapsed(prev => {
      const s = new Set(prev)
      s.delete('meeting')
      return s
    })
    setMode('edit')
    setFocusId(n.id)
    setTimeout(() => document.getElementById(`pn-${n.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }, [])

  async function saveVersion(e: React.FormEvent) {
    e.preventDefault()
    if (!doc || !versionLabel?.trim()) return
    try {
      const v = await track(repo.createPlaybookVersion(versionLabel.trim(), doc))
      setVersions(prev => [v, ...prev])
      setVersionLabel(null)
    } catch (err) {
      fail(err)
    }
  }

  async function restore(v: PlaybookVersion) {
    if (!doc || !confirm(`Restaurar "${v.label}"? O processo atual será guardado no histórico antes.`)) return
    try {
      const backup = await track(repo.createPlaybookVersion(`Antes de restaurar ${v.label}`, doc))
      setVersions(prev => [backup, ...prev])
      setDoc(structuredClone(v.content))
      setShowVersions(false)
    } catch (err) {
      fail(err)
    }
  }

  function jump(id: string, sectionId: string) {
    setCollapsed(prev => {
      const s = new Set(prev)
      s.delete(sectionId)
      return s
    })
    setTimeout(() => document.getElementById(`pn-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  const prep = doc?.sections.find(s => s.id === 'prep')
  const meeting = doc?.sections.find(s => s.id === 'meeting')
  const meetingBlocks = meeting?.nodes.filter(n => n.kind === 'item').length ?? 0

  const nav = doc && (
    <>
      {doc.sections.map(s => {
        const nums = pb.numberChildren(s.nodes, null, s.id === 'prep' ? 'P' : '')
        return (
          <div key={s.id} className="pb-nav-group">
            <div className="pb-nav-title">{s.title}</div>
            {s.nodes
              .filter(n => n.kind === 'item')
              .map((n, i) => (
                <button key={n.id} className="pb-nav-item" onClick={() => jump(n.id, s.id)}>
                  <span className="pb-nav-num" style={{ color: s.id === 'prep' ? 'var(--muted)' : pb.BLOCK_COLORS[i % pb.BLOCK_COLORS.length] }}>
                    {nums.get(n.id)}
                  </span>
                  <span className="ellipsis">{n.text || 'Sem título'}</span>
                </button>
              ))}
          </div>
        )
      })}
    </>
  )

  return (
    <Layout
      {...shell}
      onNew={addBlock}
      newLabel="Novo bloco"
      list={doc ? nav : <div className="muted pad">Carregando…</div>}
      toast={toast}
      overlay={
        <>
          {showVersions && <VersionsModal versions={versions} onRestore={restore} onClose={() => setShowVersions(false)} />}
          {versionLabel !== null && (
            <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setVersionLabel(null)}>
              <form className="modal" onSubmit={saveVersion}>
                <h3>Salvar versão</h3>
                <p className="muted small" style={{ margin: 0 }}>Uma foto do processo como está agora, para você comparar ou voltar depois.</p>
                <label className="field">
                  <span>Nome da versão</span>
                  <input autoFocus value={versionLabel} onChange={e => setVersionLabel(e.target.value)} placeholder="Ex.: v12 — novo SPIN" />
                </label>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setVersionLabel(null)}>Cancelar</button>
                  <button className="btn btn-primary" disabled={!versionLabel.trim()}>Salvar versão</button>
                </div>
              </form>
            </div>
          )}
        </>
      }
      main={
        doc && (
          <Ctx.Provider value={ctx}>
            <div className={`detail playbook mode-${mode}`}>
              <header className="pb-head">
                <p className="pb-eyebrow">
                  Preparação · {prep?.nodes.length ?? 0} itens &nbsp;|&nbsp; Reunião · {meetingBlocks} blocos · {pb.countItems({ sections: meeting ? [meeting] : [] })} itens
                </p>
                <h1 className="pb-title">Processo padrão de reunião</h1>
              </header>

              <div className="pb-controls">
                <div className="segmented">
                  <button className={mode === 'use' ? 'on' : ''} onClick={() => setMode('use')}>Usar na call</button>
                  <button className={mode === 'edit' ? 'on' : ''} onClick={() => setMode('edit')}>Editar</button>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setCollapsed(new Set())}>Expandir tudo</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setCollapsed(new Set(pb.allParentIds(doc)))}>Recolher tudo</button>
                {checked.size > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setChecked(new Set())}>Limpar checks ({checked.size})</button>
                )}
                <span className="spacer" />
                <button className="btn btn-ghost btn-sm" onClick={() => setShowVersions(true)}>Histórico ({versions.length})</button>
                <button className="btn btn-primary btn-sm" onClick={() => setVersionLabel(nextVersionLabel(versions))}>Salvar versão</button>
              </div>

              {mode === 'edit' && (
                <p className="pb-help">
                  <kbd>Enter</kbd> novo item · <kbd>Tab</kbd> / <kbd>⇧ Tab</kbd> muda o nível · <kbd>⌥ ↑↓</kbd> reordena · <kbd>⌫</kbd> em linha vazia apaga ·
                  links: <code>[texto](https://…)</code>
                </p>
              )}

              {doc.sections.map(s => {
                const open = !collapsed.has(s.id)
                const nums = pb.numberChildren(s.nodes, null, s.id === 'prep' ? 'P' : '')
                let block = 0
                return (
                  <section key={s.id} className={`pb-section pb-${s.id}`}>
                    <button className="pb-band" aria-expanded={open} onClick={() => toggleCollapse(s.id)}>
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
                        {mode === 'edit' && (
                          <button
                            className="pb-add"
                            onClick={() => {
                              const n = pb.newNode()
                              apply(d => pb.appendToSection(d, s.id, n))
                              setFocusId(n.id)
                            }}
                          >
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
    />
  )
}
