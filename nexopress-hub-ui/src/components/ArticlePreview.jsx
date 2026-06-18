import { CMS_ID } from '../main.jsx'

/**
 * Vista previa del artículo en formato lectura — sin la barra de
 * herramientas, sin el SeoPanel, sin chrome editorial. Simula cómo
 * se va a ver en el sitio público.
 *
 * Renderiza en una "maqueta" responsiva con meta header (sitio +
 * fecha + categoría) y luego el HTML del editor tal cual quedó.
 */
export default function ArticlePreview({
  open,
  onClose,
  title,
  category,
  author,
  imageUrl,
  metaDescription,
  contentHtml,
  siteName = CMS_ID,
}) {
  if (!open) return null

  const dateStr = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Sanitizar el HTML antes de inyectar (defensa contra XSS si el
  // contenido viniera comprometido desde la DB)
  const safeHtml = (html) => {
    if (!html) return ''
    // Remover scripts y event handlers
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/ on\w+="[^"]*"/g, '')
      .replace(/ on\w+='[^']*'/g, '')
  }

  return (
    <div className="article-preview-overlay" onClick={onClose}>
      <div
        className="article-preview-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Vista previa del artículo"
      >
        <div className="article-preview-toolbar">
          <div className="article-preview-toolbar-title">
            <span className="badge badge-primary">VISTA PREVIA</span>
            <span className="text-muted text-sm">— {siteName}</span>
          </div>
          <div className="flex" style={{ gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => window.print()}
            >
              🖨 Imprimir
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={onClose}
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        <div className="article-preview-body">
          <article className="article-preview-article">
            <header className="article-preview-header">
              {category && (
                <div className="article-preview-category">
                  <span className="badge badge-secondary">{category}</span>
                </div>
              )}
              <h1 className="article-preview-title">
                {title || '(Artículo sin título)'}
              </h1>
              <div className="article-preview-meta">
                <span>
                  Por <strong>{author || 'Redacción'}</strong>
                </span>
                <span>·</span>
                <span>{dateStr}</span>
              </div>
            </header>

            {imageUrl && (
              <div className="article-preview-hero">
                <img src={imageUrl} alt={title || 'Imagen del artículo'} />
              </div>
            )}

            {metaDescription && (
              <div className="article-preview-excerpt">
                <p>
                  <em>{metaDescription}</em>
                </p>
              </div>
            )}

            <div
              className="article-preview-content prose"
              dangerouslySetInnerHTML={{ __html: safeHtml(contentHtml) }}
            />

            <footer className="article-preview-footer">
              <hr />
              <p className="text-sm text-muted text-center">
                Esta es una vista previa. La maquetación final depende del
                sitio donde se publique ({siteName}).
              </p>
            </footer>
          </article>
        </div>
      </div>
    </div>
  )
}
