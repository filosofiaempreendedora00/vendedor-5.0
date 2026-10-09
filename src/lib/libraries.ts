import type { SnippetKind } from '../types'

/** Etapa da cadência: as categorias com estes nomes viram blocos numerados, nesta ordem. */
export interface Stage {
  category: string
  title: string
  hint: string
  color: string
}

export interface LibraryConfig {
  kind: SnippetKind
  noun: string
  newLabel: string
  search: string
  emptyList: string
  emptyTitle: string
  emptyText: string
  namePlaceholder: string
  copyLabel: string
  editorPlaceholder: string
  mono: boolean
  categories: string[]
  stages?: Stage[]
}

export const LIBRARIES: Record<SnippetKind, LibraryConfig> = {
  messages: {
    kind: 'messages',
    noun: 'mensagem',
    newLabel: 'Nova mensagem',
    search: 'Buscar mensagem…',
    emptyList: 'Nenhuma mensagem ainda.',
    emptyTitle: 'Monte seu banco de mensagens',
    emptyText: 'Mensagens prontas para leads: primeiro contato, follow-up, pós-reunião… Copie com um clique e cole no WhatsApp ou no e-mail.',
    namePlaceholder: 'Ex.: Follow-up 24h sem resposta',
    copyLabel: 'Copiar mensagem',
    editorPlaceholder: 'Escreva a mensagem exatamente como vai enviar ao lead…',
    mono: false,
    categories: ['Primeiro contato', 'Confirmação de reunião', 'Proposta', 'Objeções'],
    stages: [
      { category: 'Pós-reunião', title: 'Pós-reunião', hint: 'Logo depois da call', color: '#34d399' },
      { category: 'Follow-up de valor', title: 'Follow-ups de valor', hint: 'Manter a conversa viva entregando valor', color: '#9a8dff' },
      { category: 'Aquecedor', title: 'Aquecedor', hint: 'Reaquecer leads que estão esfriando — inclui o ultimato', color: '#f0a35e' },
    ],
  },
  prompts: {
    kind: 'prompts',
    noun: 'prompt',
    newLabel: 'Novo prompt',
    search: 'Buscar prompt…',
    emptyList: 'Nenhum prompt ainda.',
    emptyTitle: 'Guarde seu primeiro prompt',
    emptyText: 'Uma biblioteca dos prompts que você usa no Claude. Dê um nome, cole o texto e copie com um clique quando precisar.',
    namePlaceholder: 'Ex.: Análise de objeções da call',
    copyLabel: 'Copiar prompt',
    editorPlaceholder: 'Escreva ou cole o prompt aqui…',
    mono: true,
    categories: ['Análise de call', 'Preparação', 'Pesquisa', 'Escrita'],
  },
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Plano B para quando o navegador bloqueia a API de área de transferência
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}
