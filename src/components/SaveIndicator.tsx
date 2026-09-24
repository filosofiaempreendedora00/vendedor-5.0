import { useSaveStatus } from '../lib/unsaved'

const LABEL = { saved: 'Salvo', saving: 'Salvando…', unsaved: 'Não salvo', error: 'Erro ao salvar' }

export default function SaveIndicator() {
  const status = useSaveStatus()
  return (
    <span className={`save-status save-${status}`} title={status === 'unsaved' ? 'Aperte Enter ou saia do campo para salvar' : undefined}>
      <span className="save-dot" /> {LABEL[status]}
    </span>
  )
}
