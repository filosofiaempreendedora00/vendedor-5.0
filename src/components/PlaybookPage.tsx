import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Repo } from '../lib/repo'
import type { ClientPlaybook, ClientPlaybookPatch, NodeKind, PlaybookDoc, PlaybookVersion } from '../types'
import * as pb from '../lib/playbook'
import * as ov from '../lib/overlay'
import { formatDate, normalizeUrl } from '../lib/format'
import { track } from '../lib/unsaved'
import { useAutosave } from '../lib/useAutosave'
import { useToast } from '../lib/useToast'
import Layout, { type ShellProps } from './Layout'
import type { PlaybookCtx } from './PlaybookNode'
import PlaybookTree from './PlaybookTree'
import VersionsModal from './VersionsModal'
import NewClientModal from './NewClientModal'

interface Props extends ShellProps {
  repo: Repo
}

const COLLAPSE_KEY = 'closer-lab:playbook-collapsed'
const VIEW_KEY = 'closer-lab:playbook-view'
const MASTER = 'master'

function loadSet(key: string, fallback: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    return new Set(raw ? JSON.parse(raw) : fallback)
  } catch {
    return new Set(fallback)
  }
}

function nextVersionLabel(versions: PlaybookVersion[]) {
  const nums = versions.map(v => Number(v.label.match(/^v(\d+)/i)?.[1] ?? 0))
  return `v${Math.max(0, ...nums) + 1}`
}

const toggleIn = (set: Set<string>, id: string) => {
  const s = new Set(set)
  s.has(id) ? s.delete(id) : s.add(id)
  return s
}

const clientFields = (c: ClientPlaybook): ClientPlaybookPatch => ({
  name: c.name, company: c.company, meeting_date: c.meeting_date, context: c.context, notes: c.notes, overlay: c.overlay,
})

export default function PlaybookPage({ repo, ...shell }: Props) {
  const [master, setMaster] = useState<PlaybookDoc | null>(null)
  const [versions, setVersions] = useState<PlaybookVersion[]>([])
  const [clients, setClients] = useState<ClientPlaybook[]>([])
  const [view, setView] = useState<string>(() => {
    try { return localStorage.getItem(VIEW_KEY) ?? MASTER } catch { return MASTER }
  })
  const [mode, setMode] = useState<'use' | 'edit'>('use')
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadSet(COLLAPSE_KEY, ['prep']))
  const [masterChecks, setMasterChecks] = useState<Set<string>>(new Set())
  const [focusId, setFocusId] = useState<string | null>(null)
  const [showVersions, setShowVersions] = useState(false)
  const [versionLabel, setVersionLabel] = useState<string | null>(null)
  const [creatingClient, setCreatingClient] = useState(false)
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
      const cs = await repo.listClientPlaybooks()
      setMaster(content)
      setVersions(vs)
      setClients(cs)
      setView(v => (v === MASTER || cs.some(c => c.id === v) ? v : MASTER))
    })().catch(fail)
  }, [repo, fail])

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsed])) } catch { /* ignora */ }
  }, [collapsed])
  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view) } catch { /* ignora */ }
  }, [view])

  const client = view === MASTER ? null : clients.find(c => c.id === view) ?? null

  // Salvamento automático do modelo e do cliente aberto
  useAutosave(master ? MASTER : null, master, (_, v) => repo.savePlaybook(v), fail)
  useAutosave(client?.id ?? null, client ? clientFields(client) : null, (id, v) => repo.updateClientPlaybook(id, v), fail)

  const merged = useMemo(() => {
    if (!master) return null
    return client ? ov.merge(master, client.overlay) : ov.asMerged(master)
  }, [master, client])

  const updateClient = (patch: Partial<ClientPlaybook>) =>
    setClients(prev => prev.map(c => (c.id === view ? { ...c, ...patch } : c)))
  const updateOverlay = (fn: (o: ClientPlaybook['overlay']) => ClientPlaybook['overlay']) =>
    setClients(prev => prev.map(c => (c.id === view ? { ...c, overlay: fn(c.overlay) } : c)))
  const applyMaster = (fn: (d: PlaybookDoc) => PlaybookDoc) => setMaster(d => (d ? fn(d) : d))

  const toggleCollapse = useCallback((id: string) => setCollapsed(prev => toggleIn(prev, id)), [])
  const expand = (id: string) =>
    setCollapsed(prev => {
      const s = new Set(prev)
      s.delete(id)
      return s
    })

  /* ---------- operações: no modelo ou no cliente ---------- */

  function removeNode(id: string, viaBackspace: boolean) {
    if (!merged) return
    const order = pb.visibleOrder(merged as PlaybookDoc, collapsed)
    const prev = order[order.indexOf(id) - 1]
    const loc = ov.locateMerged(merged, id)
    const hiding = client && loc?.node.origin === 'master'
    if (!viaBackspace && !hiding && !confirm('Excluir este item e tudo que estiver dentro dele?')) return
    if (client) updateOverlay(o => ov.remove(o, merged, id))
    else applyMaster(d => pb.removeNode(d, id))
    if (viaBackspace && prev) setFocusId(prev)
  }

  const ctx: PlaybookCtx | null = merged && {
    mode,
    client: !!client,
    collapsed,
    toggleCollapse,
    checked: client ? new Set(client.overlay.checked) : masterChecks,
    toggleCheck: id => (client ? updateOverlay(o => ov.toggleChecked(o, id)) : setMasterChecks(prev => toggleIn(prev, id))),
    answers: client?.overlay.answers ?? {},
    onAnswer: (id, text) => updateOverlay(o => ov.setAnswer(o, id, text)),
    focusId,
    clearFocus: () => setFocusId(null),
    onText: (id, text) => (client ? updateOverlay(o => ov.setNode(o, master!, id, { text })) : applyMaster(d => pb.updateNode(d, id, { text }))),
    onKind: (id, kind: NodeKind) => (client ? updateOverlay(o => ov.setNode(o, master!, id, { kind })) : applyMaster(d => pb.updateNode(d, id, { kind }))),
    onEnter: node => {
      const n = pb.newNode(node.kind === 'item' ? 'item' : node.kind)
      if (client) updateOverlay(o => ov.insertAfter(o, merged, node.id, n))
      else applyMaster(d => pb.insertAfter(d, node.id, n))
      setFocusId(n.id)
    },
    onIndent: (id, out) => {
      if (client) updateOverlay(o => (out ? ov.outdent(o, merged, id) : ov.indent(o, merged, id)))
      else applyMaster(d => (out ? pb.outdent(d, id) : pb.indent(d, id)))
      setFocusId(id)
    },
    onMove: (id, dir) => {
      if (client) updateOverlay(o => ov.move(o, merged, id, dir))
      else applyMaster(d => pb.move(d, id, dir))
      setFocusId(id)
    },
    onRemove: removeNode,
    onAddChild: id => {
      const n = pb.newNode()
      if (client) updateOverlay(o => ov.appendChild(o, merged, id, n))
      else applyMaster(d => pb.appendChild(d, id, n))
      expand(id)
      setFocusId(n.id)
    },
    onRevert: id => updateOverlay(o => ov.revert(o, id)),
  }

  function addToSection(sectionId: string) {
    const n = pb.newNode()
    if (client) updateOverlay(o => ov.appendToSection(o, sectionId, n))
    else applyMaster(d => pb.appendToSection(d, sectionId as 'prep' | 'meeting', n))
    expand(sectionId)
    setFocusId(n.id)
  }

  /* ---------- clientes ---------- */

  const openNewClient = useCallback(() => setCreatingClient(true), [])

  async function createClient(input: { name: string; company: string; meeting_date: string }) {
    try {
      const c = await track(repo.createClientPlaybook(input))
      setClients(prev => [c, ...prev])
      setView(c.id)
      setMode('edit')
      setCreatingClient(false)
    } catch (e) {
      fail(e)
    }
  }

  async function deleteClient() {
    if (!client || !confirm(`Excluir o roteiro de "${client.name}"? As anotações deste cliente serão perdidas.`)) return
    try {
      await track(repo.deleteClientPlaybook(client.id))
      setClients(prev => prev.filter(c => c.id !== client.id))
      setView(MASTER)
    } catch (e) {
      fail(e)
    }
  }

  /* ---------- versões do modelo ---------- */

  async function saveVersion(e: React.FormEvent) {
    e.preventDefault()
    if (!master || !versionLabel?.trim()) return
    try {
      const v = await track(repo.createPlaybookVersion(versionLabel.trim(), master))
      setVersions(prev => [v, ...prev])
      setVersionLabel(null)
    } catch (err) {
      fail(err)
    }
  }

  async function restore(v: PlaybookVersion) {
    if (!master || !confirm(`Restaurar "${v.label}"? O modelo atual será guardado no histórico antes.`)) return
    try {
      const backup = await track(repo.createPlaybookVersion(`Antes de restaurar ${v.label}`, master))
      setVersions(prev => [backup, ...prev])
      setMaster(structuredClone(v.content))
      setShowVersions(false)
    } catch (err) {
      fail(err)
    }
  }

  function jump(id: string, sectionId: string) {
    expand(sectionId)
    setTimeout(() => document.getElementById(`pn-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  function selectView(v: string) {
    setView(v)
    setMode('use')
    document.querySelector('.main')?.scrollTo({ top: 0 })
  }

  /* ---------- barra lateral ---------- */

  const outline = merged && (
    <div className="pb-outline">
      {merged.sections.map(s => {
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
    </div>
  )

  const sidebar = master ? (
    <>
      <div className="list-group">
        <div className="list-group-title">Modelo</div>
        <button className={`meeting-item ${view === MASTER ? 'active' : ''}`} onClick={() => selectView(MASTER)}>
          <span className="meeting-item-title">Processo padrão</span>
          <span className="meeting-item-meta">
            <span>{versions[0] ? `Última versão: ${versions[0].label}` : 'Sem versões salvas'}</span>
          </span>
        </button>
      </div>

      <div className="list-group">
        <div className="list-group-title">
          Clientes <span className="list-group-count">{clients.length}</span>
        </div>
        {clients.length === 0 && <div className="muted pad small">Nenhum roteiro ainda. Crie um para cada reunião.</div>}
        {clients.map(c => {
          const st = ov.overlayStats(c.overlay)
          return (
            <button key={c.id} className={`meeting-item ${view === c.id ? 'active' : ''}`} onClick={() => selectView(c.id)}>
              <span className="meeting-item-title">{c.name}</span>
              <span className="meeting-item-meta">
                <span className="ellipsis">{[c.company, formatDate(c.meeting_date)].filter(Boolean).join(' · ')}</span>
                {st.checked + st.answers > 0 && <span className="count pos" title="Perguntas feitas + anotações">✓ {st.checked + st.answers}</span>}
              </span>
            </button>
          )
        })}
      </div>

      <div className="list-group">
        <div className="list-group-title">{client ? `Roteiro de ${client.name}` : 'Estrutura do modelo'}</div>
        {outline}
      </div>
    </>
  ) : (
    <div className="muted pad">Carregando…</div>
  )

  /* ---------- conteúdo ---------- */

  let main = null
  if (merged && ctx && master) {
    const meeting = merged.sections.find(s => s.id === 'meeting')
    const meetingBlocks = meeting?.nodes.filter(n => n.kind === 'item').length ?? 0

    if (client) {
      const st = ov.overlayStats(client.overlay)
      const links = [...client.context.matchAll(/https?:\/\/\S+|(?:www\.)\S+/g)].map(m => m[0])
      main = (
        <div className="detail playbook client-playbook">
          <header className="pb-head">
            <p className="pb-eyebrow">Roteiro de cliente · baseado no processo padrão</p>
            <input className="title-input pb-client-name" value={client.name} onChange={e => updateClient({ name: e.target.value })} aria-label="Nome do cliente" />
            <div className="meta-row">
              <label className="category-field">
                <span className="category-icon">@</span>
                <input value={client.company} onChange={e => updateClient({ company: e.target.value })} placeholder="Empresa" aria-label="Empresa" />
              </label>
              <input type="date" className="chip-input" value={client.meeting_date} onChange={e => e.target.value && updateClient({ meeting_date: e.target.value })} aria-label="Data da reunião" />
              <span className="muted small">
                {st.added} personalizados · {st.edited} editados · {st.checked} perguntas feitas · {st.answers} anotações
              </span>
              <span className="spacer" />
              <button className="btn btn-danger-ghost btn-sm" onClick={deleteClient}>Excluir</button>
            </div>
          </header>

          <section className="pb-context">
            <label htmlFor="ctx">Contexto e links do cliente</label>
            <textarea
              id="ctx"
              rows={3}
              value={client.context}
              onChange={e => updateClient({ context: e.target.value })}
              placeholder="Briefing da pré-vendas, LinkedIn, site, Instagram, o que você descobriu na pesquisa…"
            />
            {links.length > 0 && (
              <div className="link-chips">
                {links.map((l, i) => (
                  <a key={i} className="link-chip" href={normalizeUrl(l) ?? l} target="_blank" rel="noreferrer">
                    {l.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)} ↗
                  </a>
                ))}
              </div>
            )}
          </section>

          <PlaybookTree
            doc={merged}
            ctx={ctx}
            modeLabels={['Na call', 'Preparar']}
            onMode={setMode}
            onExpandAll={() => setCollapsed(new Set())}
            onCollapseAll={() => setCollapsed(new Set(pb.allParentIds(merged as PlaybookDoc)))}
            onAddToSection={addToSection}
            controls={
              client.overlay.hidden.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => updateOverlay(ov.unhideAll)}>
                  Mostrar {client.overlay.hidden.length} {client.overlay.hidden.length === 1 ? 'item oculto' : 'itens ocultos'}
                </button>
              )
            }
            editHelp={
              <>
                <br />
                Tudo que você mudar aqui fica <b>só neste cliente</b>. Itens novos aparecem com a etiqueta <span className="pn-tag custom">cliente</span>, textos do
                modelo alterados com <span className="pn-tag edited">editado</span> (use ↺ para voltar ao modelo) e o × oculta o item só aqui.
              </>
            }
          />

          <section className="notes pb-notes">
            <label htmlFor="client-notes">Resumo da reunião e próximos passos</label>
            <textarea
              id="client-notes"
              rows={5}
              value={client.notes}
              onChange={e => updateClient({ notes: e.target.value })}
              placeholder="Como foi, objeções, combinados, próximo passo e data…"
            />
          </section>
        </div>
      )
    } else {
      main = (
        <div className="detail playbook">
          <header className="pb-head">
            <p className="pb-eyebrow">
              Preparação · {merged.sections[0]?.nodes.length ?? 0} itens &nbsp;|&nbsp; Reunião · {meetingBlocks} blocos ·{' '}
              {pb.countItems({ sections: meeting ? [meeting] : [] })} itens
            </p>
            <h1 className="pb-title">Processo padrão de reunião</h1>
            {clients.length > 0 && (
              <p className="muted small pb-master-note">Mudanças aqui aparecem nos {clients.length} roteiros de cliente, sem apagar o que foi personalizado em cada um.</p>
            )}
          </header>
          <PlaybookTree
            doc={merged}
            ctx={ctx}
            modeLabels={['Visualizar', 'Editar modelo']}
            onMode={setMode}
            onExpandAll={() => setCollapsed(new Set())}
            onCollapseAll={() => setCollapsed(new Set(pb.allParentIds(master)))}
            onAddToSection={addToSection}
            controls={
              <>
                {masterChecks.size > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setMasterChecks(new Set())}>Limpar checks ({masterChecks.size})</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setShowVersions(true)}>Histórico ({versions.length})</button>
                <button className="btn btn-primary btn-sm" onClick={() => setVersionLabel(nextVersionLabel(versions))}>Salvar versão</button>
              </>
            }
          />
        </div>
      )
    }
  }

  return (
    <Layout
      {...shell}
      onNew={openNewClient}
      newLabel="Novo cliente"
      list={sidebar}
      toast={toast}
      main={main}
      overlay={
        <>
          {creatingClient && <NewClientModal onCancel={() => setCreatingClient(false)} onCreate={createClient} />}
          {showVersions && <VersionsModal versions={versions} onRestore={restore} onClose={() => setShowVersions(false)} />}
          {versionLabel !== null && (
            <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setVersionLabel(null)}>
              <form className="modal" onSubmit={saveVersion}>
                <h3>Salvar versão</h3>
                <p className="muted small" style={{ margin: 0 }}>Uma foto do modelo como está agora, para você comparar ou voltar depois.</p>
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
    />
  )
}
