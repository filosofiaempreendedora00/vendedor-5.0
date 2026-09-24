import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="brand brand-lg">
          <span className="brand-mark">◆</span> Closer Lab
        </div>
        <p className="muted">Revise cada reunião. Cresça a cada call.</p>
        {status === 'sent' ? (
          <div className="notice">
            Link de acesso enviado para <b>{email}</b>. Abra seu e-mail e clique no link.
          </div>
        ) : (
          <>
            <label className="field">
              <span>E-mail</span>
              <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" />
            </label>
            <button className="btn btn-primary btn-block" disabled={status === 'sending'}>
              {status === 'sending' ? 'Enviando…' : 'Receber link de acesso'}
            </button>
            {status === 'error' && <div className="error-text">{error}</div>}
          </>
        )}
      </form>
    </div>
  )
}
