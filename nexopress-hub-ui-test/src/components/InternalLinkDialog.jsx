import { useEffect, useRef, useState } from 'react'
import Tooltip from './Tooltip.jsx'
import { API_BASE } from '../main.jsx'

/**
 * Diálogo de inserción de enlace con dos modos:
 *  - Externo: URL arbitraria (comportamiento original).
 *  - Interno: buscador en el CMS actual con debounce.
 *
 * Si hay texto seleccionado, el link se aplica como Mark al texto.
 * Si no, se inserta un placeholder "[texto del enlace]" envuelto en <a>.
 */
export default function InternalLinkDialog({ editor, cms, onClose }) {
  const [tab, setTab] = useState('internal') // 'internal' | 'external'
  const [externalUrl, setExternalUrl] = useState(
    editor?.getAttributes('link')?.href || ''
  )
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [tab])

  // Debounced search
  useEffect(() => {
    if (tab !== 'internal') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setSelectedIdx(0)
      return
    }
    setLoading(true)
    setError(null)
    debounceRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('hub_token')
        const url = `${API_BASE}/cms/${cms}/articles?search=${encodeURIComponent(query)}&limit=10`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setResults(data.articles || [])
        setSelectedIdx(0)
      } catch (e) {
        setError(e.message)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => clearTimeout(debounceRef.current)
  }, [query, tab, cms])

  const insertLink = (href, displayText) => {
    if (!editor) return
    const { from, to, empty } = editor.state.selection
    if (empty) {
      // No hay selección: insertar texto placeholder envuelto en link
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: displayText,
          marks: [{ type: 'link', attrs: { href } }],
        })
        .run()
    } else {
      // Hay selección: aplicar link al rango
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .extendMarkRange('link')
        .setLink({ href })
        .run()
    }
    onClose()
  }

  const handleExternalSubmit = (e) => {
    e?.preventDefault()
    const url = externalUrl.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      onClose()
      return
    }
    insertLink(url, url)
  }

  const handleSelectArticle = (article) => {
    if (!article.slug) return
    // El href interno es una ruta relativa al sitio.
    // El article trae "site" en algunos casos; si no, usamos el slug solo
    // (la URL canónica en el sitio es /articulo?slug=... o /{slug} según
    // el routing del sitio).
    const href = article.slug.startsWith('http')
      ? article.slug
      : `/${article.slug}`
    insertLink(href, article.title)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
      scrollSelectedIntoView()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
      scrollSelectedIntoView()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const sel = results[selectedIdx]
      if (sel) handleSelectArticle(sel)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const scrollSelectedIntoView = () => {
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector('.is-selected')
      el?.scrollIntoView({ block: 'nearest' })
    })
  }

  return (
    <div className="link-dialog-overlay" onClick={onClose}>
      <div
        className="link-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Insertar enlace"
      >
        <div className="link-dialog-tabs">
          <button
            type="button"
            className={tab === 'internal' ? 'is-active' : ''}
            onClick={() => setTab('internal')}
          >
            📚 Artículo del CMS
          </button>
          <button
            type="button"
            className={tab === 'external' ? 'is-active' : ''}
            onClick={() => setTab('external')}
          >
            🌐 URL externa
          </button>
          <button
            type="button"
            className="link-dialog-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {tab === 'external' ? (
          <form onSubmit={handleExternalSubmit} className="link-dialog-body">
            <label className="link-dialog-label">URL completa</label>
            <input
              ref={inputRef}
              type="text"
              className="link-dialog-input"
              placeholder="https://ejemplo.com/articulo"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
            />
            <div className="link-dialog-actions">
              <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary btn-sm">
                Insertar
              </button>
            </div>
          </form>
        ) : (
          <div className="link-dialog-body">
            <label className="link-dialog-label">
              Buscar artículos en el CMS ({cms})
            </label>
            <input
              ref={inputRef}
              type="text"
              className="link-dialog-input"
              placeholder="Escribe al menos 2 letras para buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {loading && <div className="link-dialog-hint">Buscando…</div>}
            {error && <div className="link-dialog-error">Error: {error}</div>}
            {!loading && query.trim() && results.length === 0 && !error && (
              <div className="link-dialog-hint">
                No se encontraron artículos que coincidan con "{query}".
              </div>
            )}
            {results.length > 0 && (
              <ul className="link-dialog-results" ref={listRef}>
                {results.map((a, i) => (
                  <li
                    key={a.id}
                    className={i === selectedIdx ? 'is-selected' : ''}
                    onClick={() => handleSelectArticle(a)}
                    onMouseEnter={() => setSelectedIdx(i)}
                  >
                    <div className="link-result-title">{a.title}</div>
                    <div className="link-result-meta">
                      <span className="badge badge-secondary">{a.category}</span>
                      <span className="text-xs text-muted">/{a.slug}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="link-dialog-hint text-xs">
              ↑↓ para navegar · Enter para seleccionar · Esc para cerrar
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
