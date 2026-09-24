import { useCallback, useState } from 'react'

export function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const fail = useCallback((err: unknown) => {
    console.error(err)
    setToast(err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Erro ao salvar')
    setTimeout(() => setToast(null), 5000)
  }, [])
  return { toast, fail }
}
