/** Converte o link de uma gravação no endereço do player incorporável. Retorna null se não suportado. */
export function toEmbedUrl(raw: string | null): string | null {
  if (!raw) return null
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\./, '')

  if (host === 'drive.google.com') {
    const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? u.searchParams.get('id')
    return id ? `https://drive.google.com/file/d/${id}/preview` : null
  }
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1)
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (host.endsWith('youtube.com')) {
    const id = u.searchParams.get('v') ?? u.pathname.match(/\/(?:shorts|live|embed)\/([^/]+)/)?.[1]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  if (host.endsWith('loom.com')) {
    const id = u.pathname.match(/\/(?:share|embed)\/([^/]+)/)?.[1]
    return id ? `https://www.loom.com/embed/${id}` : null
  }
  if (host === 'vimeo.com') {
    const id = u.pathname.match(/^\/(\d+)/)?.[1]
    return id ? `https://player.vimeo.com/video/${id}` : null
  }
  return null
}

/** Link que baixa o arquivo direto (Google Drive); outros links seguem como estão. */
export function toDownloadUrl(raw: string): string {
  try {
    const u = new URL(raw)
    if (u.hostname.replace(/^www\./, '') === 'drive.google.com') {
      const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? u.searchParams.get('id')
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`
    }
  } catch {
    /* link inválido: devolve como veio */
  }
  return raw
}
