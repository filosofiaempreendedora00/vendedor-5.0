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
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast, fail } = useToast()
  const kind = config.kind

  useEffect(() => {
    repo
      .listSnippets(kind)
      .then(list => {
        setItems(list)
        setSelectedId(list[0]?.id ?? null)
      })
      .catch(fail)
      .finally(() => setLoading(false))
  }, [repo, kind, fail])

  const categories = useMemo(() => {
    const used = items.map(i => i.category).filter(Boolean)
    return [...new Set([...used, ...config.categories])].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [items, config.categories])

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
    return [...map.entries()].sort(([a], [b]) => (a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : a.localeCompare(b, 'pt-BR')))
  }, [items, query])

  const selected = items.find(i => i.id === selectedId) ?? null
  const openNew = useCallback(() => setCreating(true), [])

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

  return (
    <Layout
      {...shell}
      onNew={openNew}
      newLabel={config.newLabel}
      query={query}
      onQuery={setQuery}
      searchPlaceholder={config.search}
      toast={toast}
      overlay={creating && <NewSnippetModal config={config} categories={categories} onCancel={() => setCreating(false)} onCreate={create} />}
      list={
        <>
          {loading && <div className="muted pad">Carregando…</div>}
          {!loading && groups.length === 0 && (
            <div className="muted pad">{items.length ? 'Nada encontrado.' : config.emptyList}</div>
          )}
          {groups.map(([cat, list]) => (
            <div key={cat} className="list-group">
              {showGroups && (
                <div className="list-group-title">
                  {cat} <span className="list-group-count">{list.length}</span>
                </div>
              )}
              {list.map(s => {
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
          ))}
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
