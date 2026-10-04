import type { NodeKind, PNode, PlaybookDoc } from '../types'

/* ---------- criação ---------- */

const mk = (kind: NodeKind) => (text: string, ...children: PNode[]): PNode => ({ id: crypto.randomUUID(), kind, text, children })
const i = mk('item')
const ex = (text: string) => mk('example')(text)
const note = (text: string) => mk('note')(text)
const ck = (text: string) => mk('check')(text)

export const newNode = (kind: NodeKind = 'item'): PNode => mk(kind)('')

const paths = (lead: string, question: string) =>
  i(lead, ex(question), i('Goals (Objetivos)'), i('Plans (Planos)'), i('Challenges (Desafios)'))

/** Processo v11, importado de processo-reuniao.html */
export function seedPlaybook(): PlaybookDoc {
  return {
    sections: [
      {
        id: 'prep',
        title: 'Antes da reunião',
        nodes: [i('Briefing de qualificação está bom?'), i('Pré-reunião (Discovery e pesquisa sobre o nicho)')],
      },
      {
        id: 'meeting',
        title: 'Reunião',
        nodes: [
          i('Abertura',
            i('Breve apresentação (sobre você)'),
            i('Recapitular o que foi conversado com a pré-vendas',
              i('Entendi com fulano que sua situação é XPTO e que suas maiores questões são de resolver X, Y e Z. Seria esse mesmo o grande FOCO de nossa conversa? Você gostaria de complementar em algum sentido?')),
            i('Alinhamentos iniciais',
              ck('Recomendação'),
              ck('É um diálogo, e não um monólogo (pode me interromper à vontade: quanto mais, melhor)'),
              ck('Possibilidade de fechamento na call'))),
          i('Ganho de autoridade → Se mostrar especialista no mercado dele'),
          i('Explicação breve da Turbo (Diferenciação imediata)',
            i('Holding de negócios digitais — que também fornece soluções de marketing digital ao mercado',
              i('[Bready](https://www.instagram.com/meubready/)'),
              i('[flashCRM](https://www.flashcrm.com.br/)'),
              i('[Cells](https://www.instagram.com/cellsoficial/)'),
              i('Outros saindo do forno...'))),
          i('Investigação',
            i('Pergunta aberta inicial',
              paths('Se for inbound', 'Qual sua expectativa para essa reunião?'),
              paths('Se for outbound', 'O que chamou sua atenção para você participar dessa reunião hoje?')),
            note('Ouvir com atenção e se envolver na conversa, fazendo mais perguntas.'),
            i('Perguntas técnicas'),
            i('SPIN',
              i('S — Situação (o contexto atual dele)',
                ex('Como funciona hoje a aquisição de clientes de vocês, do primeiro contato até a venda?'),
                ex('Quanto vocês investem em mídia hoje e quem cuida disso no dia a dia?'),
                ex('Quais números vocês acompanham de perto todo mês?')),
              i('P — Problema (as dificuldades dentro desse contexto)',
                ex('Qual parte desse processo mais te tira o sono hoje?'),
                ex('O que vocês já tentaram para resolver isso e não funcionou como esperavam?'),
                ex('Onde você sente que está deixando dinheiro na mesa?')),
              i('I — Implicação (as consequências de não resolver)',
                ex('Se seguir do mesmo jeito pelos próximos 6 meses, o que acontece com a meta de vocês?'),
                ex('Quanto isso custa por mês, somando verba desperdiçada e oportunidade perdida?'),
                ex('Como isso respinga no time e nas outras áreas da operação?')),
              i('N — Necessidade de solução (o valor de resolver, dito por ele)',
                ex('Se você tivesse previsibilidade de leads qualificados todo mês, o que mudaria aí dentro?'),
                ex('Quanto valeria para vocês destravar isso ainda neste trimestre?'),
                ex('Por que resolver isso é importante para você, especificamente?'))),
            i('Validação - GPCTBA',
              i('Timing (Tempo)', ex('E quando vocês pretendem ter já esse problema resolvido?')),
              i('Budget (Orçamento)', ex('Qual o budget que você reservou pra investir em marketing?')),
              i('Authority (Autoridade)',
                ex('Como funciona o processo decisório de vocês?'),
                ex('Pra uma decisão desse tamanho aí dentro, quem mais precisa estar confortável?')))),
          i('Apresenta uma solução (Desvinculado da Turbo)', i('Apresentar garantindo diversos micropactos')),
          i('Validar solução'),
          i('Testar fechamento'),
          i('Apresentar como a Turbo resolve o problema'),
          i('Validações de escopo, modelo trabalho, cases', i('Apresentar garantindo diversos micropactos')),
          i('Apresentar proposta (Ou puxar para R2)'),
        ],
      },
    ],
  }
}

/* ---------- numeração e cores ---------- */

export const BLOCK_COLORS = ['#8b9bff', '#34d3b4', '#f0a35e', '#c084fc', '#60a5fa', '#4ade80', '#f472b6', '#22d3ee', '#facc15', '#f87171']

/** Numeração automática: 01, 1.1, 1.1.1 (reunião) e P1, P1.1 (preparação). Só itens recebem número. */
export function numberChildren(nodes: PNode[], parentNum: string | null, prefix: 'P' | ''): Map<string, string> {
  const out = new Map<string, string>()
  let n = 0
  for (const node of nodes) {
    if (node.kind !== 'item') continue
    n++
    const num = parentNum === null ? (prefix === 'P' ? `P${n}` : String(n).padStart(2, '0')) : `${parentNum}.${n}`
    out.set(node.id, num)
  }
  return out
}

export const childBase = (num: string) => (/^\d+$/.test(num) ? String(Number(num)) : num)

/* ---------- operações na árvore (imutáveis) ---------- */

interface Loc {
  list: PNode[]
  index: number
  parent: PNode | null
}

function locate(doc: PlaybookDoc, id: string): Loc | null {
  const walk = (list: PNode[], parent: PNode | null): Loc | null => {
    for (let index = 0; index < list.length; index++) {
      if (list[index].id === id) return { list, index, parent }
      const r = walk(list[index].children, list[index])
      if (r) return r
    }
    return null
  }
  for (const s of doc.sections) {
    const r = walk(s.nodes, null)
    if (r) return r
  }
  return null
}

function edit(doc: PlaybookDoc, fn: (d: PlaybookDoc) => void): PlaybookDoc {
  const d = structuredClone(doc)
  fn(d)
  return d
}

export const updateNode = (doc: PlaybookDoc, id: string, patch: Partial<Pick<PNode, 'text' | 'kind'>>) =>
  edit(doc, d => {
    const l = locate(d, id)
    if (l) Object.assign(l.list[l.index], patch)
  })

export const insertAfter = (doc: PlaybookDoc, id: string, node: PNode) =>
  edit(doc, d => {
    const l = locate(d, id)
    if (l) l.list.splice(l.index + 1, 0, node)
  })

export const appendChild = (doc: PlaybookDoc, parentId: string, node: PNode) =>
  edit(doc, d => {
    const l = locate(d, parentId)
    if (l) l.list[l.index].children.push(node)
  })

export const appendToSection = (doc: PlaybookDoc, sectionId: PlaybookDoc['sections'][number]['id'], node: PNode) =>
  edit(doc, d => {
    d.sections.find(s => s.id === sectionId)?.nodes.push(node)
  })

export const removeNode = (doc: PlaybookDoc, id: string) =>
  edit(doc, d => {
    const l = locate(d, id)
    if (l) l.list.splice(l.index, 1)
  })

/** Transforma no último filho do irmão anterior. */
export const indent = (doc: PlaybookDoc, id: string) =>
  edit(doc, d => {
    const l = locate(d, id)
    if (!l || l.index === 0) return
    const [node] = l.list.splice(l.index, 1)
    l.list[l.index - 1].children.push(node)
  })

/** Sobe um nível, logo depois do pai. */
export const outdent = (doc: PlaybookDoc, id: string) =>
  edit(doc, d => {
    const l = locate(d, id)
    if (!l || !l.parent) return
    const p = locate(d, l.parent.id)!
    const [node] = l.list.splice(l.index, 1)
    p.list.splice(p.index + 1, 0, node)
  })

export const move = (doc: PlaybookDoc, id: string, dir: -1 | 1) =>
  edit(doc, d => {
    const l = locate(d, id)
    if (!l) return
    const j = l.index + dir
    if (j < 0 || j >= l.list.length) return
    ;[l.list[l.index], l.list[j]] = [l.list[j], l.list[l.index]]
  })

/** Ids na ordem em que aparecem na tela (ignorando ramos recolhidos). */
export function visibleOrder(doc: PlaybookDoc, collapsed: Set<string>): string[] {
  const out: string[] = []
  const walk = (list: PNode[]) => {
    for (const n of list) {
      out.push(n.id)
      if (!collapsed.has(n.id)) walk(n.children)
    }
  }
  doc.sections.forEach(s => !collapsed.has(s.id) && walk(s.nodes))
  return out
}

export function allParentIds(doc: PlaybookDoc): string[] {
  const out: string[] = []
  const walk = (list: PNode[]) => list.forEach(n => n.children.length && (out.push(n.id), walk(n.children)))
  doc.sections.forEach(s => walk(s.nodes))
  return out
}

export function countItems(doc: PlaybookDoc) {
  let n = 0
  const walk = (list: PNode[]) => list.forEach(x => (n++, walk(x.children)))
  doc.sections.forEach(s => walk(s.nodes))
  return n
}

/** Converte [texto](url) e links soltos em partes renderizáveis. */
export function parseLinks(text: string): ({ text: string } | { text: string; href: string })[] {
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/\S+)/g
  const parts: ({ text: string } | { text: string; href: string })[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index! > last) parts.push({ text: text.slice(last, m.index) })
    parts.push(m[1] ? { text: m[1], href: m[2] } : { text: m[3], href: m[3] })
    last = m.index! + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
