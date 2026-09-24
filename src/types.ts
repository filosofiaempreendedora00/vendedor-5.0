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
