import { CMS_ID, API_BASE } from '../main.jsx'

/**
 * Vista previa de cómo se verá el snippet del artículo en Google.
 * Muestra el title con la keyword en negrita (lo que Google hace al
 * matchear), la URL canónica, y la meta description con la keyword
 * resaltada.
 *
 * Props:
 *  - title, slug, metaDescription, focusKeyword, siteName
 *  - siteBase (dominio del sitio, p. ej. "noticiasalinstante.pages.dev")
 */
export default function SerpPreview({
  title,
  slug,
  metaDescription,
  focusKeyword,
  siteName = CMS_ID,
  siteBase = `${CMS_ID}.sebastianvernis.workers.dev`,
}) {
  const cleanTitle = (title || 'Título del artículo').trim()
  const cleanSlug = (slug || 'titulo-del-articulo').trim()
  const cleanDesc =
    (metaDescription && metaDescription.trim()) ||
    'Agrega una meta description de entre 120 y 156 caracteres para que Google la muestre en los resultados de búsqueda.'
  const cleanKw = (focusKeyword || '').trim().toLowerCase()

  // Google recorta titles a ~580px (~60 chars); descriptions a ~920px (~156 chars)
  const TRUNC_TITLE = 60
  const TRUNC_DESC = 156
  const displayTitle =
    cleanTitle.length > TRUNC_TITLE
      ? cleanTitle.slice(0, TRUNC_TITLE - 1) + '…'
      : cleanTitle
  const displayDesc =
    cleanDesc.length > TRUNC_DESC ? cleanDesc.slice(0, TRUNC_DESC - 1) + '…' : cleanDesc

  // Resaltar la keyword en el texto (Google la pone en bold)
  const highlight = (text) => {
    if (!cleanKw) return text
    const escaped = cleanKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
    return parts.map((p, i) =>
      p.toLowerCase() === cleanKw ? (
        <b key={i}>{p}</b>
      ) : (
        <span key={i}>{p}</span>
      )
    )
  }

  // Construir breadcrumb como lo haría Google
  const url = `https://${siteBase}/${cleanSlug || '...'}`
  const breadcrumb = siteName

  // Advertencias
  const warnings = []
  if (cleanTitle.length > TRUNC_TITLE) {
    warnings.push(
      `El título mide ${cleanTitle.length} caracteres; Google lo corta a ~${TRUNC_TITLE}.`
    )
  }
  if (cleanTitle.length < 40 && cleanTitle.length > 0) {
    warnings.push(
      `El título mide ${cleanTitle.length} caracteres; conviene que tenga entre 40 y 60 para aprovechar el espacio.`
    )
  }
  if (!metaDescription) {
    warnings.push('Falta la meta description. Sin ella, Google muestra un fragmento aleatorio del contenido.')
  } else if (cleanDesc.length < 120) {
    warnings.push(
      `La meta description mide ${cleanDesc.length} caracteres; conviene que tenga entre 120 y 156.`
    )
  } else if (cleanDesc.length > TRUNC_DESC) {
    warnings.push(
      `La meta description mide ${cleanDesc.length} caracteres; Google la cortará a ~${TRUNC_DESC}.`
    )
  }
  if (!cleanKw) {
    warnings.push('Define una palabra clave objetivo en el SeoPanel para ver el resaltado.')
  } else if (!cleanTitle.toLowerCase().includes(cleanKw)) {
    warnings.push(`La palabra clave "${cleanKw}" no aparece en el título.`)
  }

  return (
    <div className="serp-preview">
      <h3 className="card-title" style={{ marginBottom: '12px' }}>
        Vista previa en Google
      </h3>
      <div className="serp-snippet">
        <div className="serp-breadcrumb">
          {siteBase} &nbsp;›&nbsp; {breadcrumb}
        </div>
        <a className="serp-title" onClick={(e) => e.preventDefault()} href={url}>
          {highlight(displayTitle)}
        </a>
        <div className="serp-url">{url}</div>
        <div className="serp-description">
          {new Date().toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}{' '}
          — {highlight(displayDesc)}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="serp-warnings">
          {warnings.map((w, i) => (
            <div key={i} className="serp-warning">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      <div className="serp-meta text-xs text-muted">
        Título: {cleanTitle.length}/{TRUNC_TITLE} · Descripción: {cleanDesc.length}/{TRUNC_DESC}
        {cleanKw && ` · Keyword: "${cleanKw}"`}
      </div>
    </div>
  )
}
