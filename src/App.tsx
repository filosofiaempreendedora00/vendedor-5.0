import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { localRepo, supabaseRepo } from './lib/repo'
import Login from './components/Login'
import Workspace from './components/Workspace'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)

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

  if (!ready) return <div className="splash">Carregando…</div>
  if (supabase && !session) return <Login />

  return (
    <Workspace
      repo={repo}
      userEmail={session?.user.email ?? null}
      onSignOut={supabase ? () => supabase!.auth.signOut() : undefined}
    />
  )
}
