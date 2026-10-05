import type { SupabaseClient } from '@supabase/supabase-js'
import type { Meeting, MeetingInput, MeetingPatch, MeetingPoint, PointKind, Snippet, SnippetKind, SnippetPatch, PlaybookDoc, PlaybookVersion, ClientPlaybook, ClientPlaybookPatch } from '../types'
import { emptyOverlay } from './overlay'

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
  listSnippets(kind: SnippetKind): Promise<Snippet[]>
  createSnippet(kind: SnippetKind, title: string, category: string): Promise<Snippet>
  updateSnippet(kind: SnippetKind, id: string, patch: SnippetPatch): Promise<void>
  deleteSnippet(kind: SnippetKind, id: string): Promise<void>
  getPlaybook(): Promise<PlaybookDoc | null>
  savePlaybook(content: PlaybookDoc): Promise<void>
  listPlaybookVersions(): Promise<PlaybookVersion[]>
  createPlaybookVersion(label: string, content: PlaybookDoc): Promise<PlaybookVersion>
  listClientPlaybooks(): Promise<ClientPlaybook[]>
  createClientPlaybook(input: Pick<ClientPlaybook, 'name' | 'company' | 'meeting_date'>): Promise<ClientPlaybook>
  updateClientPlaybook(id: string, patch: ClientPlaybookPatch): Promise<void>
  deleteClientPlaybook(id: string): Promise<void>
}

const byClientDate = (a: ClientPlaybook, b: ClientPlaybook) => b.meeting_date.localeCompare(a.meeting_date) || b.created_at.localeCompare(a.created_at)

export const byTitle = (a: Snippet, b: Snippet) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' })

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
    async listSnippets(kind) {
      return (check(await db.from(kind).select('*')) as Snippet[]).map(x => ({ ...x, category: x.category ?? '' })).sort(byTitle)
    },
    async createSnippet(kind, title, category) {
      return check(await db.from(kind).insert({ title, category }).select().single()) as Snippet
    },
    async updateSnippet(kind, id, patch) {
      check(await db.from(kind).update(patch).eq('id', id))
    },
    async deleteSnippet(kind, id) {
      check(await db.from(kind).delete().eq('id', id))
    },
    async getPlaybook() {
      const row = check(await db.from('playbooks').select('content').maybeSingle()) as { content: PlaybookDoc } | null
      return row?.content ?? null
    },
    async savePlaybook(content) {
      check(await db.from('playbooks').upsert({ content }, { onConflict: 'user_id' }))
    },
    async listPlaybookVersions() {
      return check(await db.from('playbook_versions').select('*').order('created_at', { ascending: false })) as PlaybookVersion[]
    },
    async createPlaybookVersion(label, content) {
      return check(await db.from('playbook_versions').insert({ label, content }).select().single()) as PlaybookVersion
    },
    async listClientPlaybooks() {
      return (check(await db.from('client_playbooks').select('*')) as ClientPlaybook[]).sort(byClientDate)
    },
    async createClientPlaybook(input) {
      return check(await db.from('client_playbooks').insert({ ...input, overlay: emptyOverlay() }).select().single()) as ClientPlaybook
    },
    async updateClientPlaybook(id, patch) {
      check(await db.from('client_playbooks').update(patch).eq('id', id))
    },
    async deleteClientPlaybook(id) {
      check(await db.from('client_playbooks').delete().eq('id', id))
    },
  }
}

const KEY = 'closer-lab:v1'
interface LocalState { meetings: Meeting[]; points: MeetingPoint[]; prompts: Snippet[]; messages: Snippet[]; playbook: PlaybookDoc | null; versions: PlaybookVersion[]; clients: ClientPlaybook[] }

export function localRepo(): Repo {
  const load = (): LocalState => {
    try {
      return { meetings: [], points: [], prompts: [], messages: [], playbook: null, versions: [], clients: [], ...JSON.parse(localStorage.getItem(KEY) || '') }
    } catch {
      return { meetings: [], points: [], prompts: [], messages: [], playbook: null, versions: [], clients: [] }
    }
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
    async listSnippets(kind) {
      return load()[kind].map(x => ({ ...x, category: x.category ?? '' })).sort(byTitle)
    },
    async createSnippet(kind, title, category) {
      const s = load()
      const x: Snippet = { id: crypto.randomUUID(), title, content: '', category, created_at: now(), updated_at: now() }
      s[kind].push(x); save(s); return x
    },
    async updateSnippet(kind, id, patch) {
      const s = load()
      s[kind] = s[kind].map(x => (x.id === id ? { ...x, ...patch, updated_at: now() } : x)); save(s)
    },
    async deleteSnippet(kind, id) {
      const s = load()
      s[kind] = s[kind].filter(x => x.id !== id); save(s)
    },
    async getPlaybook() {
      return load().playbook
    },
    async savePlaybook(content) {
      const s = load()
      s.playbook = content; save(s)
    },
    async listPlaybookVersions() {
      return load().versions.sort((a, b) => b.created_at.localeCompare(a.created_at))
    },
    async createPlaybookVersion(label, content) {
      const s = load()
      const v: PlaybookVersion = { id: crypto.randomUUID(), label, content, created_at: now() }
      s.versions.push(v); save(s); return v
    },
    async listClientPlaybooks() {
      return load().clients.sort(byClientDate)
    },
    async createClientPlaybook(input) {
      const s = load()
      const c: ClientPlaybook = { id: crypto.randomUUID(), context: '', notes: '', overlay: emptyOverlay(), created_at: now(), updated_at: now(), ...input }
      s.clients.push(c); save(s); return c
    },
    async updateClientPlaybook(id, patch) {
      const s = load()
      s.clients = s.clients.map(c => (c.id === id ? { ...c, ...patch, updated_at: now() } : c)); save(s)
    },
    async deleteClientPlaybook(id) {
      const s = load()
      s.clients = s.clients.filter(c => c.id !== id); save(s)
    },
  }
}
