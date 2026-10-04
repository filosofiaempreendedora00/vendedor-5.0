import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { localRepo, supabaseRepo } from './lib/repo'
import { todayISO } from './lib/format'
import Login from './components/Login'
import MeetingsPage from './components/MeetingsPage'
import PromptsPage from './components/PromptsPage'
import PlaybookPage from './components/PlaybookPage'
import type { Section } from './components/Layout'

const SECTION_KEY = 'closer-lab:section'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)
  const [section, setSection] = useState<Section>(() => {
    try {
      const v = localStorage.getItem(SECTION_KEY)
      return v === 'prompts' || v === 'playbook' ? v : 'meetings'
    } catch {
      return 'meetings'
    }
  })

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const repo = useMemo(() => (supabase ? supabaseRepo(supabase) : localRepo()), [])

  function changeSection(s: Section) {
    setSection(s)
    try { localStorage.setItem(SECTION_KEY, s) } catch { /* ignora */ }
  }

  async function backup() {
    const [meetings, points, prompts, playbook, playbook_versions] = await Promise.all([
      repo.listMeetings(), repo.listPoints(), repo.listPrompts(), repo.getPlaybook(), repo.listPlaybookVersions(),
    ])
    const data = { exported_at: new Date().toISOString(), meetings, points, prompts, playbook, playbook_versions }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `closer-lab-backup-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!ready) return <div className="splash">Carregando…</div>
  if (supabase && !session) return <Login />

  const shell = {
    section,
    onSection: changeSection,
    userEmail: session?.user.email ?? null,
    onSignOut: supabase ? () => void supabase!.auth.signOut() : undefined,
    onBackup: backup,
  }

  if (section === 'prompts') return <PromptsPage repo={repo} {...shell} />
  if (section === 'playbook') return <PlaybookPage repo={repo} {...shell} />
  return <MeetingsPage repo={repo} {...shell} />
}
