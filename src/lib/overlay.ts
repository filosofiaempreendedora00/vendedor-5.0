import type { Addition, ClientOverlay, NodeKind, PNode, PlaybookDoc } from '../types'

/** Nó já combinado (modelo + personalizações), com a origem marcada. */
export type MNode = PNode & { origin: 'master' | 'custom'; overridden: boolean; children: MNode[] }
export interface MergedDoc {
  sections: { id: 'prep' | 'meeting'; title: string; nodes: MNode[] }[]
}

export const emptyOverlay = (): ClientOverlay => ({ overrides: {}, hidden: [], additions: [], answers: {}, checked: [] })

const asCustom = (n: PNode): MNode => ({ ...n, origin: 'custom', overridden: false, children: n.children.map(asCustom) })

export function asMerged(doc: PlaybookDoc): MergedDoc {
  const conv = (n: PNode): MNode => ({ ...n, origin: 'master', overridden: false, children: n.children.map(conv) })
  return { sections: doc.sections.map(s => ({ ...s, nodes: s.nodes.map(conv) })) }
}

function masterIndex(doc: PlaybookDoc) {
  const map = new Map<string, PNode>()
  const walk = (l: PNode[]) => l.forEach(n => (map.set(n.id, n), walk(n.children)))
  doc.sections.forEach(s => walk(s.nodes))
  return map
}

/** Aplica as personalizações do cliente sobre o modelo atual. */
export function merge(master: PlaybookDoc, ov: ClientOverlay): MergedDoc {
  const hidden = new Set(ov.hidden)
  const known = masterIndex(master)
  const sectionIds = new Set(master.sections.map(s => s.id as string))
  const byParent = new Map<string, Addition[]>()
  for (const a of ov.additions) {
    // Se o item do modelo onde a personalização estava pendurada sumiu, ela vai para o fim da reunião
    const parent = known.has(a.parentId) || sectionIds.has(a.parentId) ? a.parentId : 'meeting'
    byParent.set(parent, [...(byParent.get(parent) ?? []), a])
  }

  const mergeList = (nodes: PNode[], parentId: string): MNode[] => {
    const out: MNode[] = nodes
      .filter(n => !hidden.has(n.id))
      .map(n => {
        const o = ov.overrides[n.id]
        const text = o?.text ?? n.text
        const kind = o?.kind ?? n.kind
        return { ...n, text, kind, origin: 'master', overridden: text !== n.text || kind !== n.kind, children: mergeList(n.children, n.id) }
      })
    for (const a of byParent.get(parentId) ?? []) {
      const i = a.afterId ? out.findIndex(x => x.id === a.afterId) : -1
      if (i >= 0) out.splice(i + 1, 0, asCustom(a.node))
      else out.push(asCustom(a.node))
    }
    return out
  }

  return { sections: master.sections.map(s => ({ ...s, nodes: mergeList(s.nodes, s.id) })) }
}

/* ---------- localização ---------- */

interface MLoc {
  node: MNode
  list: MNode[]
  index: number
  parent: MNode | null
  sectionId: string
}

export function locateMerged(doc: MergedDoc, id: string): MLoc | null {
  for (const s of doc.sections) {
    const walk = (list: MNode[], parent: MNode | null): MLoc | null => {
      for (let index = 0; index < list.length; index++) {
        if (list[index].id === id) return { node: list[index], list, index, parent, sectionId: s.id }
        const r = walk(list[index].children, list[index])
        if (r) return r
      }
      return null
    }
    const r = walk(s.nodes, null)
    if (r) return r
  }
  return null
}

interface CLoc {
  addIndex: number
  node: PNode
  parentNode: PNode | null // null = é a raiz da personalização
  index: number
}

function locateCustom(ov: ClientOverlay, id: string): CLoc | null {
  for (let addIndex = 0; addIndex < ov.additions.length; addIndex++) {
    const root = ov.additions[addIndex].node
    if (root.id === id) return { addIndex, node: root, parentNode: null, index: -1 }
    const walk = (p: PNode): CLoc | null => {
      for (let index = 0; index < p.children.length; index++) {
        const c = p.children[index]
        if (c.id === id) return { addIndex, node: c, parentNode: p, index }
        const r = walk(c)
        if (r) return r
      }
      return null
    }
    const r = walk(root)
    if (r) return r
  }
  return null
}

/** Remove um item personalizado e devolve o nó, mantendo a ordem dos demais. */
function extract(ov: ClientOverlay, id: string): PNode | null {
  const c = locateCustom(ov, id)
  if (!c) return null
  if (c.parentNode) return c.parentNode.children.splice(c.index, 1)[0]
  const [a] = ov.additions.splice(c.addIndex, 1)
  ov.additions.forEach(x => x.parentId === a.parentId && x.afterId === id && (x.afterId = a.afterId))
  return a.node
}

/* ---------- operações (imutáveis) ---------- */

const edit = (ov: ClientOverlay, fn: (o: ClientOverlay) => void) => {
  const o = structuredClone(ov)
  fn(o)
  return o
}

export const setNode = (ov: ClientOverlay, master: PlaybookDoc, id: string, patch: { text?: string; kind?: NodeKind }) =>
  edit(ov, o => {
    const custom = locateCustom(o, id)
    if (custom) return void Object.assign(custom.node, patch)
    const base = masterIndex(master).get(id)
    if (!base) return
    const cur = { ...o.overrides[id], ...patch }
    if (cur.text === base.text) delete cur.text
    if (cur.kind === base.kind) delete cur.kind
    if (Object.keys(cur).length) o.overrides[id] = cur
    else delete o.overrides[id]
  })

export const revert = (ov: ClientOverlay, id: string) => edit(ov, o => void delete o.overrides[id])

export const unhideAll = (ov: ClientOverlay) => edit(ov, o => void (o.hidden = []))

export const insertAfter = (ov: ClientOverlay, merged: MergedDoc, id: string, node: PNode) =>
  edit(ov, o => {
    const loc = locateMerged(merged, id)
    if (!loc) return
    if (loc.node.origin === 'custom' && loc.parent?.origin === 'custom') {
      const p = locateCustom(o, loc.parent.id)!
      const i = p.node.children.findIndex(c => c.id === id)
      p.node.children.splice(i + 1, 0, node)
    } else {
      o.additions.push({ parentId: loc.parent?.id ?? loc.sectionId, afterId: id, node })
    }
  })

export const appendChild = (ov: ClientOverlay, merged: MergedDoc, id: string, node: PNode) =>
  edit(ov, o => {
    const loc = locateMerged(merged, id)
    if (!loc) return
    if (loc.node.origin === 'custom') locateCustom(o, id)!.node.children.push(node)
    else o.additions.push({ parentId: id, afterId: null, node })
  })

export const appendToSection = (ov: ClientOverlay, sectionId: string, node: PNode) =>
  edit(ov, o => void o.additions.push({ parentId: sectionId, afterId: null, node }))

export const remove = (ov: ClientOverlay, merged: MergedDoc, id: string) =>
  edit(ov, o => {
    const loc = locateMerged(merged, id)
    if (!loc) return
    if (loc.node.origin === 'master') o.hidden.push(id)
    else extract(o, id)
  })

/** Só itens personalizados mudam de nível: a estrutura do modelo pertence ao modelo. */
export const indent = (ov: ClientOverlay, merged: MergedDoc, id: string) =>
  edit(ov, o => {
    const loc = locateMerged(merged, id)
    if (!loc || loc.node.origin !== 'custom' || loc.index === 0) return
    const prev = loc.list[loc.index - 1]
    const node = extract(o, id)!
    if (prev.origin === 'custom') locateCustom(o, prev.id)!.node.children.push(node)
    else o.additions.push({ parentId: prev.id, afterId: null, node })
  })

export const outdent = (ov: ClientOverlay, merged: MergedDoc, id: string) =>
  edit(ov, o => {
    const loc = locateMerged(merged, id)
    if (!loc || loc.node.origin !== 'custom' || !loc.parent) return
    const parent = loc.parent
    const node = extract(o, id)!
    if (parent.origin === 'custom') {
      const p = locateCustom(o, parent.id)!
      if (p.parentNode) p.parentNode.children.splice(p.index + 1, 0, node)
      else o.additions.push({ parentId: o.additions[p.addIndex].parentId, afterId: parent.id, node })
    } else {
      const g = locateMerged(merged, parent.id)!
      o.additions.push({ parentId: g.parent?.id ?? g.sectionId, afterId: parent.id, node })
    }
  })

export const move = (ov: ClientOverlay, merged: MergedDoc, id: string, dir: -1 | 1) =>
  edit(ov, o => {
    const loc = locateMerged(merged, id)
    if (!loc || loc.node.origin !== 'custom' || loc.parent?.origin !== 'custom') return
    const list = locateCustom(o, loc.parent.id)!.node.children
    const i = list.findIndex(c => c.id === id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
  })

export const setAnswer = (ov: ClientOverlay, id: string, text: string) =>
  edit(ov, o => {
    if (text) o.answers[id] = text
    else delete o.answers[id]
  })

export const toggleChecked = (ov: ClientOverlay, id: string) =>
  edit(ov, o => {
    o.checked = o.checked.includes(id) ? o.checked.filter(x => x !== id) : [...o.checked, id]
  })

export function overlayStats(ov: ClientOverlay) {
  const count = (n: PNode): number => 1 + n.children.reduce((s, c) => s + count(c), 0)
  return {
    added: ov.additions.reduce((s, a) => s + count(a.node), 0),
    edited: Object.keys(ov.overrides).length,
    hidden: ov.hidden.length,
    answers: Object.keys(ov.answers).length,
    checked: ov.checked.length,
  }
}
