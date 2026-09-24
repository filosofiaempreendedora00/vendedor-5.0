import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meeting, MeetingInput, MeetingPatch, MeetingPoint, PointKind } from '../types'

/** Camada de dados. Supabase quando configurado; localStorage como modo de teste. */
export interface Repo {
  listMeetings(): Promise<Meeting[]>
  createMeeting(input: MeetingInput): Promise<Meeting>
  updateMeeting(id: string, patch: MeetingPatch): Promise<void>
  deleteMeeting(id: string): Promise<void>
  listPoints(): Promise<MeetingPoint[]>
  addPoint(meetingId: string, kind: PointKind, content: string): Promise<MeetingPoint>
  updatePoint(id: string, content: string): Promise<void>
  deletePoint(id: string): Promise<void>
}

function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error
  return res.data
}

export function supabaseRepo(db: SupabaseClient): Repo {
  return {
    async listMeetings() {
      return check(await db.from('meetings').select('*').order('meeting_date', { ascending: false }).order('created_at', { ascending: false })) as Meeting[]
    },
    async createMeeting(input) {
      return check(await db.from('meetings').insert(input).select().single()) as Meeting
    },
    async updateMeeting(id, patch) {
      check(await db.from('meetings').update(patch).eq('id', id))
    },
    async deleteMeeting(id) {
      check(await db.from('meetings').delete().eq('id', id))
    },
    async listPoints() {
      return check(await db.from('meeting_points').select('*').order('created_at')) as MeetingPoint[]
    },
    async addPoint(meeting_id, kind, content) {
      return check(await db.from('meeting_points').insert({ meeting_id, kind, content }).select().single()) as MeetingPoint
    },
    async updatePoint(id, content) {
      check(await db.from('meeting_points').update({ content }).eq('id', id))
    },
    async deletePoint(id) {
      check(await db.from('meeting_points').delete().eq('id', id))
    },
  }
}

const KEY = 'closer-lab:v1'
interface LocalState { meetings: Meeting[]; points: MeetingPoint[] }

export function localRepo(): Repo {
  const load = (): LocalState => {
    try { return JSON.parse(localStorage.getItem(KEY) || '') } catch { return { meetings: [], points: [] } }
  }
  const save = (s: LocalState) => localStorage.setItem(KEY, JSON.stringify(s))
  const now = () => new Date().toISOString()

  return {
    async listMeetings() {
      return load().meetings.sort((a, b) => b.meeting_date.localeCompare(a.meeting_date) || b.created_at.localeCompare(a.created_at))
    },
    async createMeeting(input) {
      const s = load()
      const m: Meeting = { id: crypto.randomUUID(), notes: '', created_at: now(), updated_at: now(), ...input }
      s.meetings.push(m); save(s); return m
    },
    async updateMeeting(id, patch) {
      const s = load()
      s.meetings = s.meetings.map(m => (m.id === id ? { ...m, ...patch, updated_at: now() } : m)); save(s)
    },
    async deleteMeeting(id) {
      const s = load()
      s.meetings = s.meetings.filter(m => m.id !== id)
      s.points = s.points.filter(p => p.meeting_id !== id); save(s)
    },
    async listPoints() {
      return load().points
    },
    async addPoint(meeting_id, kind, content) {
      const s = load()
      const p: MeetingPoint = { id: crypto.randomUUID(), meeting_id, kind, content, created_at: now() }
      s.points.push(p); save(s); return p
    },
    async updatePoint(id, content) {
      const s = load()
      s.points = s.points.map(p => (p.id === id ? { ...p, content } : p)); save(s)
    },
    async deletePoint(id) {
      const s = load()
      s.points = s.points.filter(p => p.id !== id); save(s)
    },
  }
}
