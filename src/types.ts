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

export interface Prompt {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export type PromptPatch = Partial<Pick<Prompt, 'title' | 'content'>>

export type NodeKind = 'item' | 'example' | 'note' | 'check'

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
