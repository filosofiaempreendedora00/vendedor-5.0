import { useEffect, useSyncExternalStore } from 'react'

/** Rastreia edições ainda não enviadas e salvamentos em andamento. */
let dirty = 0
let pending = 0
let failed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

window.addEventListener('beforeunload', e => {
  if (dirty > 0 || pending > 0) e.preventDefault()
})

export async function track<T>(p: Promise<T>): Promise<T> {
  pending++
  failed = false
  emit()
  try {
    return await p
  } catch (e) {
    failed = true
    throw e
  } finally {
    pending--
    emit()
  }
}

/** Marca o componente como tendo edições não salvas enquanto `isDirty` for true. */
export function useDirty(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return
    dirty++
    emit()
    return () => {
      dirty--
      emit()
    }
  }, [isDirty])
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

function compute(): SaveStatus {
  return pending > 0 ? 'saving' : failed ? 'error' : dirty > 0 ? 'unsaved' : 'saved'
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useSaveStatus(): SaveStatus {
  return useSyncExternalStore(subscribe, compute)
}
