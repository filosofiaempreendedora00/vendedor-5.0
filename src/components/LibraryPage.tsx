import { useCallback, useEffect, useMemo, useState } from 'react'
import { byTitle, type Repo } from '../lib/repo'
import type { Snippet, SnippetPatch } from '../types'
import { copyText, type LibraryConfig } from '../lib/libraries'
import { track } from '../lib/unsaved'
import { useToast } from '../lib/useToast'
import Layout, { type ShellProps } from './Layout'
import SnippetDetail from './SnippetDetail'
import NewSnippetModal from './NewSnippetModal'

interface Props extends ShellProps {
  repo: Repo
  config: LibraryConfig
}

const NO_CATEGORY = 'Sem categoria'

export default function LibraryPage({ repo, config, ...shell }: Props) {
  const [items, setItems] = useState<Snippet[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [justCreated, setJustCreated] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState<false | string>(false)
  const [openStage, setOpenStage] = useState(0) // acordeão: só uma etapa aberta (a 1ª por padrão)
  const [loading, setLoading] = useState(true)
  const { toast, fail } = useToast()
  const kind = config.kind

  useEffect(() => {
    repo
      .listSnippets(kind)
      .then(list => {
        setItems(list)
        // Abre na primeira mensagem da primeira etapa que tiver conteúdo
        const order = (config.stages ?? []).map(st => st.category)
        const rank = (c: string) => (order.includes(c) ? order.indexOf(c) : order.length)
        const first = [...list].sort((a, b) => rank(a.category) - rank(b.category))[0]
        setSelectedId(first?.id ?? null)
        if (first && order.includes(first.category)) setOpenStage(order.indexOf(first.category))
      })
      .catch(fail)
      .finally(() => setLoading(false))
  }, [repo, kind, fail])

  const categories = useMemo(() => {
    const used = items.map(i => i.category).filter(Boolean)
    const stageCats = (config.stages ?? []).map(st => st.category)
    const rest = [...new Set([...used, ...config.categories])].filter(c => !stageCats.includes(c)).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return [...stageCats, ...rest]
  }, [items, config.categories, config.stages])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? items.filter(i => [i.title, i.content, i.category, ...i.parts.map(p => p.text)].some(t => t.toLowerCase().includes(q)))
      : items
    const map = new Map<string, Snippet[]>()
    for (const i of filtered) {
      const k = i.category || NO_CATEGORY
      map.set(k, [...(map.get(k) ?? []), i])
    }
    const stageCats = (config.stages ?? []).map(st => st.category)
    const others = [...map.entries()]
      .filter(([k]) => !stageCats.includes(k))
      .sort(([a], [b]) => (a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : a.localeCompare(b, 'pt-BR')))
    // Etapas aparecem sempre, na ordem, mesmo vazias (escondidas só durante uma busca sem resultado nelas)
    const staged = stageCats.map(k => [k, map.get(k) ?? []] as [string, Snippet[]]).filter(([, l]) => !q || l.length)
    return [...staged, ...others]
  }, [items, query, config.stages])

  const selected = items.find(i => i.id === selectedId) ?? null
  const openNew = useCallback(() => setCreating(''), [])

  async function create(title: string, category: string) {
    try {
      const s = await track(repo.createSnippet(kind, title, category))
      setItems(prev => [...prev, s].sort(byTitle))
      setSelectedId(s.id)
      setJustCreated(s.id)
      setCreating(false)
    } catch (e) {
      fail(e)
    }
  }

  async function update(id: string, patch: SnippetPatch) {
    const before = items
    const at = new Date().toISOString()
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch, updated_at: at } : i)).sort(byTitle))
    try {
      await track(repo.updateSnippet(kind, id, patch))
    } catch (e) {
      setItems(before)
      fail(e)
    }
  }

  async function remove(id: string) {
    const s = items.find(x => x.id === id)
    if (!s || !confirm(`Excluir "${s.title}"? Isso não pode ser desfeito.`)) return
    try {
      await track(repo.deleteSnippet(kind, id))
      const rest = items.filter(x => x.id !== id)
      setItems(rest)
      setSelectedId(rest[0]?.id ?? null)
    } catch (e) {
      fail(e)
    }
  }

  async function quickCopy(id: string, text: string) {
    await copyText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(c => (c === id ? null : c)), 1500)
  }

  const showGroups = groups.length > 1 || (groups.length === 1 && groups[0][0] !== NO_CATEGORY)
  const stageOf = (cat: string) => config.stages?.findIndex(st => st.category === cat) ?? -1
  const firstOther = groups.findIndex(([cat]) => stageOf(cat) < 0)

  return (
    <Layout
      {...shell}
      onNew={openNew}
      newLabel={config.newLabel}
      query={query}
      onQuery={setQuery}
      searchPlaceholder={config.search}
      toast={toast}
      overlay={
        creating !== false && (
          <NewSnippetModal config={config} categories={categories} initialCategory={creating} onCancel={() => setCreating(false)} onCreate={create} />
        )
      }
      list={
        <>
          {loading && <div className="muted pad">Carregando…</div>}
          {!loading && groups.length === 0 && items.length > 0 && (
            <div className="muted pad">Nada encontrado.</div>
          )}
          {!loading && items.length === 0 && !config.stages && <div className="muted pad">{config.emptyList}</div>}
          {groups.map(([cat, list], gi) => {
            const si = stageOf(cat)
            const stage = si >= 0 ? config.stages![si] : null
            // Durante uma busca, todas as etapas com resultado ficam abertas
            const stageOpen = !!stage && (query.trim() ? true : openStage === si)
            return (
            <div key={cat} className={`list-group ${stage ? `stage ${stageOpen ? 'stage-open' : 'stage-closed'}` : ''}`} style={stage ? { ['--sc' as string]: stage.color } : undefined}>
              {stage ? (
                <div
                  className={`stage-head ${stageOpen ? 'open' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={stageOpen}
                  onClick={() => setOpenStage(si)}
                  onKeyDown={e => e.key === 'Enter' && setOpenStage(si)}
                >
                  <span className="stage-num">{si + 1}</span>
                  <span className="stage-text">
                    <span className="stage-title">{stage.title}</span>
                    {stageOpen ? <span className="stage-hint">{stage.hint}</span> : <span className="stage-hint">{list.length} {list.length === 1 ? 'mensagem' : 'mensagens'}</span>}
                  </span>
                  <button
                    className="stage-add"
                    title={`Nova mensagem em ${stage.title}`}
                    onClick={e => {
                      e.stopPropagation()
                      setOpenStage(si)
                      setCreating(stage.category)
                    }}
                  >
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M8 3v10M3 8h10" />
                    </svg>
                  </button>
                </div>
              ) : (
                showGroups && (
                  <>
                    {config.stages && gi === firstOther && <div className="stage-others">Outras</div>}
                    <div className="list-group-title">
                      {cat} <span className="list-group-count">{list.length}</span>
                    </div>
                  </>
                )
              )}
              {(!stage || stageOpen) && list.map(s => {
                const multi = s.parts.length > 0
                const open = multi && s.id === selectedId
                return (
                  <div key={s.id} className={`snippet-entry ${open ? 'open' : ''}`}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`meeting-item snippet-item ${s.id === selectedId ? 'active' : ''}`}
                      onClick={() => setSelectedId(s.id)}
                      onKeyDown={e => e.key === 'Enter' && setSelectedId(s.id)}
                    >
                      <span className="meeting-item-title">{s.title}</span>
                      <span className="meeting-item-meta">
                        <span className="ellipsis">{multi ? `${s.parts.length} partes · ${s.parts.map(p => p.label).join(', ')}` : s.content.trim().split('\n')[0] || 'Vazio'}</span>
                      </span>
                      {!multi && s.content.trim() && (
                        <button
                          className={`quick-copy ${copiedId === s.id ? 'done' : ''}`}
                          title="Copiar sem abrir"
                          onClick={e => {
                            e.stopPropagation()
                            quickCopy(s.id, s.content)
                          }}
                        >
                          {copiedId === s.id ? '✓' : 'Copiar'}
                        </button>
                      )}
                    </div>
                    {open && (
                      <div className="sub-parts">
                        {s.parts.map(p => (
                          <div key={p.id} className="sub-part">
                            <span className="sub-part-text">
                              <span className="sub-part-label">{p.label}</span>
                              <span className="ellipsis">{p.text || 'Vazio'}</span>
                            </span>
                            <button
                              className={`quick-copy inline ${copiedId === p.id ? 'done' : ''}`}
                              disabled={!p.text.trim()}
                              onClick={() => quickCopy(p.id, p.text)}
                            >
                              {copiedId === p.id ? '✓' : 'Copiar'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            )
          })}
        </>
      }
      main={
        selected ? (
          <SnippetDetail
            key={selected.id}
            config={config}
            snippet={selected}
            categories={categories}
            autoFocusContent={selected.id === justCreated}
            onUpdate={patch => update(selected.id, patch)}
            onDelete={() => remove(selected.id)}
          />
        ) : (
          !loading && (
            <div className="empty">
              <div className="empty-icon">◆</div>
              <h2>{config.emptyTitle}</h2>
              <p className="muted">{config.emptyText}</p>
              <button className="btn btn-primary" onClick={openNew}>+ {config.newLabel}</button>
            </div>
          )
        )
      }
    />
  )
}
