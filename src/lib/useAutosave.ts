import { useEffect, useRef, useState } from 'react'
import { track, useDirty } from './unsaved'

/**
 * Salva `value` sozinho após uma pausa na edição. Ao trocar de `key` (ex.: outro cliente)
 * ou sair da tela, salva na hora o que estiver pendente — nada fica para trás.
 */
export function useAutosave<T>(key: string | null, value: T | null, save: (key: string, value: T) => Promise<void>, onError: (e: unknown) => void, delay = 700) {
  const saved = useRef(new Map<string, string>())
  const pending = useRef<{ key: string; value: T; json: string } | null>(null)
  const [, bump] = useState(0)
  const json = value == null ? '' : JSON.stringify(value)

  // O primeiro valor visto para cada chave é o que já está no banco
  if (key && value != null && !saved.current.has(key)) saved.current.set(key, json)

  const flush = () => {
    const p = pending.current
    if (!p) return
    pending.current = null
    track(save(p.key, p.value))
      .then(() => {
        saved.current.set(p.key, p.json)
        bump(x => x + 1)
      })
      .catch(onError)
  }

  useEffect(() => {
    if (!key || value == null) return
    if (json === saved.current.get(key)) {
      pending.current = null
      return
    }
    pending.current = { key, value, json }
    const t = setTimeout(flush, delay)
    return () => clearTimeout(t)
  }, [key, json]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => flush(), [key]) // eslint-disable-line react-hooks/exhaustive-deps

  useDirty(!!key && value != null && json !== saved.current.get(key))
}
