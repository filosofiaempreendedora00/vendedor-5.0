import { toEmbedUrl } from '../lib/embed'

export default function VideoPanel({ url }: { url: string }) {
  const src = toEmbedUrl(url)

  return (
    <div className="video-panel">
      {src ? (
        <div className="video-frame">
          <iframe src={src} title="Gravação da reunião" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <div className="video-unsupported">
          <p>Não dá para exibir este link aqui.</p>
          <p className="muted">Links suportados: Google Drive, YouTube, Loom e Vimeo.</p>
          <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">Abrir em nova aba ↗</a>
        </div>
      )}
    </div>
  )
}
