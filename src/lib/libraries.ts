import type { SnippetKind } from '../types'

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
    categories: ['Primeiro contato', 'Confirmação de reunião', 'Follow-up', 'Pós-reunião', 'Proposta', 'Objeções', 'Reativação'],
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
