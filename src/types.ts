export type PointKind = 'positive' | 'negative'

export interface Meeting {
  id: string
  title: string
  url: string | null
  meeting_date: string // YYYY-MM-DD
  notes: string
  created_at: string
  updated_at: string
}

export interface MeetingPoint {
  id: string
  meeting_id: string
  kind: PointKind
  content: string
  created_at: string
}

export type MeetingInput = Pick<Meeting, 'title' | 'url' | 'meeting_date'>
export type MeetingPatch = Partial<Pick<Meeting, 'title' | 'url' | 'meeting_date' | 'notes'>>

/** Texto reutilizável: prompts e mensagens prontas. */
export type SnippetKind = 'prompts' | 'messages'

/** Parte copiável de uma mensagem (ex.: pergunta e opções de uma enquete). */
export interface SnippetPart {
  id: string
  label: string
  text: string
}

export interface Snippet {
  id: string
  title: string
  content: string
  category: string
  parts: SnippetPart[]
  created_at: string
  updated_at: string
}

export type SnippetPatch = Partial<Pick<Snippet, 'title' | 'content' | 'category' | 'parts'>>

export type NodeKind = 'item' | 'example' | 'note' | 'check' | 'pick'

export interface PNode {
  id: string
  kind: NodeKind
  text: string
  children: PNode[]
}

export interface PlaybookSection {
  id: 'prep' | 'meeting'
  title: string
  nodes: PNode[]
}

export interface PlaybookDoc {
  sections: PlaybookSection[]
}

export interface PlaybookVersion {
  id: string
  label: string
  content: PlaybookDoc
  created_at: string
}

/** Item adicionado só no roteiro de um cliente, pendurado num item (ou seção) do modelo. */
export interface Addition {
  parentId: string
  afterId: string | null
  node: PNode
}

/** Diferenças de um cliente em relação ao modelo. O modelo continua sendo a fonte. */
export interface ClientOverlay {
  overrides: Record<string, { text?: string; kind?: NodeKind }>
  hidden: string[]
  additions: Addition[]
  answers: Record<string, string>
  checked: string[]
}

export interface ClientPlaybook {
  id: string
  name: string
  company: string
  meeting_date: string
  context: string
  notes: string
  overlay: ClientOverlay
  created_at: string
  updated_at: string
}

export type ClientPlaybookPatch = Partial<Pick<ClientPlaybook, 'name' | 'company' | 'meeting_date' | 'context' | 'notes' | 'overlay'>>
