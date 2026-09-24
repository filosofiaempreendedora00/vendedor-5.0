import { useCallback, useEffect, useMemo, useState } from 'react'
import { byTitle, type Repo } from '../lib/repo'
import type { Prompt, PromptPatch } from '../types'
import { track } from '../lib/unsaved'
import { useToast } from '../lib/useToast'
import Layout, { type ShellProps } from './Layout'
import PromptDetail from './PromptDetail'
import NewPromptModal from './NewPromptModal'

interface Props extends ShellProps {
  repo: Repo
}

export default function PromptsPage({ repo, ...shell }: Props) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [justCreated, setJustCreated] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast, fail } = useToast()

  useEffect(() => {
    repo
      .listPrompts()
      .then(p => {
        setPrompts(p)
        setSelectedId(p[0]?.id ?? null)
      })
      .catch(fail)
      .finally(() => setLoading(false))
  }, [repo, fail])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return prompts
    return prompts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
  }, [prompts, query])

  const selected = prompts.find(p => p.id === selectedId) ?? null
  const openNew = useCallback(() => setCreating(true), [])

  async function createPrompt(title: string) {
    try {
      const p = await track(repo.createPrompt(title))
      setPrompts(prev => [...prev, p].sort(byTitle))
      setSelectedId(p.id)
      setJustCreated(p.id)
      setCreating(false)
    } catch (e) {
      fail(e)
    }
  }

  async function updatePrompt(id: string, patch: PromptPatch) {
    const before = prompts
    const at = new Date().toISOString()
    setPrompts(prev => prev.map(p => (p.id === id ? { ...p, ...patch, updated_at: at } : p)).sort(byTitle))
    try {
      await track(repo.updatePrompt(id, patch))
    } catch (e) {
      setPrompts(before)
      fail(e)
    }
  }

  async function deletePrompt(id: string) {
    const p = prompts.find(x => x.id === id)
    if (!p || !confirm(`Excluir o prompt "${p.title}"? Isso não pode ser desfeito.`)) return
    try {
      await track(repo.deletePrompt(id))
      const rest = prompts.filter(x => x.id !== id)
      setPrompts(rest)
      setSelectedId(rest[0]?.id ?? null)
    } catch (e) {
      fail(e)
    }
  }

  return (
    <Layout
      {...shell}
      onNew={openNew}
      query={query}
      onQuery={setQuery}
      searchPlaceholder="Buscar prompt…"
      toast={toast}
      overlay={creating && <NewPromptModal onCancel={() => setCreating(false)} onCreate={createPrompt} />}
      list={
        <>
          {loading && <div className="muted pad">Carregando…</div>}
          {!loading && filtered.length === 0 && (
            <div className="muted pad">{prompts.length ? 'Nenhum prompt encontrado.' : 'Nenhum prompt ainda.'}</div>
          )}
          {filtered.map(p => (
            <button key={p.id} className={`meeting-item ${p.id === selectedId ? 'active' : ''}`} onClick={() => setSelectedId(p.id)}>
              <span className="meeting-item-title">{p.title}</span>
              <span className="meeting-item-meta">
                <span className="ellipsis">{p.content.trim().split('\n')[0] || 'Vazio'}</span>
              </span>
            </button>
          ))}
        </>
      }
      main={
        selected ? (
          <PromptDetail
            key={selected.id}
            prompt={selected}
            autoFocusContent={selected.id === justCreated}
            onUpdate={patch => updatePrompt(selected.id, patch)}
            onDelete={() => deletePrompt(selected.id)}
          />
        ) : (
          !loading && (
            <div className="empty">
              <div className="empty-icon">◆</div>
              <h2>Guarde seu primeiro prompt</h2>
              <p className="muted">Uma biblioteca dos prompts que você usa no Claude. Dê um nome, cole o texto e copie com um clique quando precisar.</p>
              <button className="btn btn-primary" onClick={openNew}>+ Novo prompt</button>
            </div>
          )
        )
      }
    />
  )
}
