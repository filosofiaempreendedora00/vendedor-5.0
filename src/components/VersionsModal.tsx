import { useEffect } from 'react'
import type { PlaybookVersion } from '../types'
import { countItems } from '../lib/playbook'

interface Props {
  versions: PlaybookVersion[]
  onRestore: (v: PlaybookVersion) => void
  onClose: () => void
}

export default function VersionsModal({ versions, onRestore, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <h3>Histórico de versões</h3>
        <p className="muted small" style={{ margin: 0 }}>
          Restaurar troca o processo atual pela versão escolhida. O estado atual é guardado antes, como uma nova versão.
        </p>
        <ul className="version-list">
          {versions.length === 0 && <li className="muted">Nenhuma versão salva ainda.</li>}
          {versions.map(v => (
            <li key={v.id} className="version">
              <div>
                <div className="version-label">{v.label}</div>
                <div className="muted small">
                  {new Date(v.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {countItems(v.content)} itens
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onRestore(v)}>Restaurar</button>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
