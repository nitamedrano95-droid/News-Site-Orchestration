import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Typography from '@tiptap/extension-typography'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Youtube from '@tiptap/extension-youtube'
import CharacterCount from '@tiptap/extension-character-count'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

import SeoPanel from '../components/SeoPanel'
import EditorToolbar from '../components/EditorToolbar'
import SerpPreview from '../components/SerpPreview'
import ArticlePreview from '../components/ArticlePreview'
import { TweetEmbed, InstagramEmbed } from '../components/TweetEmbed'
import { API_BASE, CMS_ID } from '../main.jsx'

const lowlight = createLowlight(common)

export default function Editor() {
  const { articleId } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle') // idle | saving | saved | error
  const [autoSaveError, setAutoSaveError] = useState(null)
  const [seoData, setSeoData] = useState(null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [focusKeyword, setFocusKeyword] = useState('')
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [lastSaved, setLastSaved] = useState(null)
  const [focusMode, setFocusMode] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [availableSites, setAvailableSites] = useState([])
  const [selectedSites, setSelectedSites] = useState([])
  const [category, setCategory] = useState('NACIONAL')
  const [imageUrl, setImageUrl] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishSites, setPublishSites] = useState([])
  const [publishFB, setPublishFB] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Refs espejo para que el handleKeyDown del editor (que se registra una sola
  // vez al montar) lea los valores actuales sin necesidad de re-registrarse.
  const previewOpenRef = useRef(false)
  const deletingRef = useRef(false)
  useEffect(() => { previewOpenRef.current = previewOpen }, [previewOpen])
  useEffect(() => { deletingRef.current = deleting }, [deleting])

  // Autosave refs y scheduler (debe existir antes de useEditor)
  const idleTimerRef = useRef(null)
  const autoSaveIntervalRef = useRef(null)
  const scheduleAutoSaveRef = useRef(null)
  const handleSaveRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({
        placeholder: 'Empieza a escribir tu artículo aquí. Usa los títulos (H2) para separar secciones, ## para convertir a subtítulo, **negritas**, *cursiva*…',
      }),
      Image.configure({ HTMLAttributes: { class: 'content-image' } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Youtube.configure({ width: 640, height: 360, HTMLAttributes: { class: 'video-container' } }),
      CharacterCount,
      CodeBlockLowlight.configure({ lowlight }),
      TweetEmbed,
      InstagramEmbed,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
        spellcheck: 'true',
      },
      handleKeyDown: (view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault()
          handleSave()
          return true
        }
        if (event.key === 'Escape') {
          // Salir del editor (volver al dashboard) cuando el foco está aquí.
          // Si hay un modal abierto (LinkDialog, ArticlePreview), el modal
          // tiene su propio listener y se cierra primero; este Esc solo
          // dispara si el editor es el receptor natural.
          if (!previewOpenRef.current && !deletingRef.current) {
            event.preventDefault()
            navigate('/')
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      if (article) {
        const updated = { ...article, content: editor.getHTML() }
        setArticle(updated)
        setSeoData((prev) => ({ ...prev, article: updated }))
      }
      // Trigger idle autosave on content change
      if (article?.status !== 'PUBLICADO' && scheduleAutoSaveRef.current) {
        scheduleAutoSaveRef.current()
      }
    },
  })

  // Schedule idle autosave on field changes (uses ref, safe during render)
  useEffect(() => {
    if (article?.status === 'PUBLICADO') return
    if (scheduleAutoSaveRef.current) scheduleAutoSaveRef.current()
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [title, slug, metaTitle, metaDescription, focusKeyword, tags, category, imageUrl, excerpt, selectedSites, article?.status])

  useEffect(() => {
    const handler = () => handleSaveRef.current?.()
    document.addEventListener('editor-save', handler)
    return () => document.removeEventListener('editor-save', handler)
  }, [])

  // Autosave: cada 30 segundos y tras 3 segundos de inactividad
  const scheduleAutoSave = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      handleSaveRef.current?.({ silent: true, isAuto: true })
    }, 3000)
  }, [])

  useEffect(() => {
    scheduleAutoSaveRef.current = scheduleAutoSave
  }, [scheduleAutoSave])

  useEffect(() => {
    if (article?.status === 'PUBLICADO') return

    autoSaveIntervalRef.current = setInterval(() => {
      handleSaveRef.current?.({ silent: true, isAuto: true })
    }, 30000)

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)
    }
  }, [article?.status])

  // Schedule idle autosave on field changes
  useEffect(() => {
    if (article?.status === 'PUBLICADO') return
    if (scheduleAutoSaveRef.current) scheduleAutoSaveRef.current()
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [title, slug, metaTitle, metaDescription, focusKeyword, tags, category, imageUrl, excerpt, selectedSites, article?.status])

  useEffect(() => {
    if (articleId !== 'new') fetchArticle()
    else setLoading(false)
    fetchSites()
  }, [articleId])

  useEffect(() => {
    if (publishOpen) {
      setPublishSites(selectedSites.length > 0 ? selectedSites : [])
    }
  }, [publishOpen, selectedSites])

  const getToken = () => localStorage.getItem('cms_token')

  const fetchSites = async () => {
    const token = getToken()
    try {
      const res = await fetch(`${API_BASE}/sites`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('No se pudo cargar sitios')
      const data = await res.json()
      const sites = Array.isArray(data) ? data : (data.sites || [])
      setAvailableSites(sites)
    } catch (err) {
      console.error('Error al cargar sitios:', err)
    }
  }

  const fetchArticle = async () => {
    const token = getToken()
    try {
      const res = await fetch(`${API_BASE}/cms/articles/${articleId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('No se encontró el artículo solicitado')
      const data = await res.json()
      const a = data.article || data
      setArticle(a)
      setTitle(a.title || '')
      setSlug(a.slug || '')
      setMetaTitle(a.metaTitle || '')
      setMetaDescription(a.metaDescription || '')
      setFocusKeyword(a.focusKeyword || '')
      setTags(a.tags || [])
      setCategory(a.category || 'NACIONAL')
      setImageUrl(a.imageUrl || '')
      setExcerpt(a.excerpt || '')
      setSelectedSites(a.site ? a.site.split(',').map(s => s.trim()).filter(Boolean) : [])
      editor?.commands.setContent(a.content || '')
      setSeoData({ article: a })
      await fetchSeoAnalysis(articleId)
    } catch (err) {
      console.error('Error al cargar el artículo:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSeoAnalysis = async (id) => {
    const token = getToken()
    try {
      const res = await fetch(`${API_BASE}/cms/articles/${id}/seo`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSeoData(data)
      }
    } catch (err) {
      console.error('Error al obtener el análisis SEO:', err)
    }
  }

  const handleAddTag = (e) => {
    e.preventDefault()
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSave = useCallback(async ({ silent = false, isAuto = false } = {}) => {
    if (!editor) return
    if (saving) return

    // No autosave artículos ya publicados
    if (isAuto && article?.status === 'PUBLICADO') return

    if (!isAuto) setSaving(true)
    else setAutoSaveStatus('saving')

    const token = getToken()
    const content = editor.getHTML()

    const payload = {
      id: articleId !== 'new' ? articleId : undefined,
      title,
      slug,
      content,
      metaTitle,
      metaDescription,
      focusKeyword,
      tags,
      category,
      imageUrl,
      excerpt,
      sitios: selectedSites,
      status: article?.status || 'BORRADOR',
      fbRequired: article?.fbRequired || false,
    }

    // Limpiar undefined para no mandar id en creación
    if (!payload.id) delete payload.id

    try {
      const url = `${API_BASE}/cms/articles`

      if (articleId !== 'new') {
        payload.id = articleId
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'No se pudo guardar el artículo')
      }

      const saved = await res.json()
      setLastSaved(new Date())

      if (!isAuto) {
        if (articleId === 'new' && saved.id) {
          navigate(`/editor/${saved.id}`)
        } else if (saved.id) {
          await fetchSeoAnalysis(saved.id)
        }
      } else {
        setAutoSaveStatus('saved')
        setAutoSaveError(null)
        // Si era nuevo, redirigir al editor con ID para que el autosave futuro sea update
        if (articleId === 'new' && saved.id) {
          navigate(`/editor/${saved.id}`)
        }
      }
    } catch (err) {
      console.error('Error al guardar:', err)
      if (!silent) {
        alert(`No se pudo guardar el artículo: ${err.message}`)
      }
      if (isAuto) {
        setAutoSaveStatus('error')
        setAutoSaveError(err.message)
      }
    } finally {
      if (!isAuto) setSaving(false)
    }
  }, [editor, saving, article, CMS_ID, articleId, title, slug, metaTitle, metaDescription, focusKeyword, tags, navigate, selectedSites, category, imageUrl, excerpt])

  useEffect(() => {
    handleSaveRef.current = handleSave
  }, [handleSave])

  const handleDelete = useCallback(async () => {
    if (articleId === 'new' || deleting) return
    const displayTitle = (title || article?.title || 'este artículo').slice(0, 80)
    const ok = window.confirm(
      `¿Eliminar "${displayTitle}"?\n\nEsta acción no se puede deshacer. El artículo se borrará del CMS y de los sitios asignados.`
    )
    if (!ok) return
    setDeleting(true)
    const token = getToken()
    try {
      const res = await fetch(`${API_BASE}/cms/articles/${articleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      navigate('/', {
        state: { deleted: articleId, deletedTitle: title || article?.title },
      })
    } catch (err) {
      console.error('Error al eliminar:', err)
      alert(`No se pudo eliminar el artículo: ${err.message}`)
    } finally {
      setDeleting(false)
    }
  }, [articleId, article, CMS_ID, deleting, navigate, title])

  const handlePublish = async () => {
    if (articleId === 'new') {
      // Para artículos nuevos: guardar primero como borrador con status PUBLICADO no, primero guardar borrador y luego publicar
      await handleSave({ silent: false })
      return
    }
    setPublishOpen(true)
  }

  const confirmPublish = async () => {
    if (publishSites.length === 0) {
      alert('Seleccioná al menos un sitio para publicar.')
      return
    }
    setPublishing(true)
    const token = getToken()
    try {
      // Asegurar que los cambios actuales estén guardados antes de publicar
      await handleSave({ silent: true })

      const res = await fetch(`${API_BASE}/cms/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: articleId,
          sitios: publishSites,
          fb_requerido: publishFB,
          title,
          slug,
          content: editor?.getHTML() || '',
          excerpt,
          category,
          imageUrl,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo publicar')
      }

      const data = await res.json()
      setArticle((prev) => prev ? { ...prev, status: 'PUBLICADO', site: publishSites.join(','), fbRequired: publishFB } : prev)
      setPublishOpen(false)
      alert(`Artículo publicado en ${data.siteCount} sitio${data.siteCount !== 1 ? 's' : ''}${publishFB ? ' y en Facebook' : ''}.`)
    } catch (err) {
      console.error('Error al publicar:', err)
      alert(`No se pudo publicar: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  const togglePublishSite = (slug) => {
    setPublishSites((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  if (loading) {
    return (
      <div className="dashboard-content">
        <p className="text-muted">Cargando artículo, por favor espera…</p>
      </div>
    )
  }

  const charCount = editor?.storage.characterCount?.characters() || 0
  const wordCount = editor?.storage.characterCount?.words() || 0
  const readingMin = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className={focusMode ? 'editor-focus-mode' : ''}>
      <header className="dashboard-header flex-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary text-sm"
            style={{ marginBottom: '8px' }}
          >
            ← Volver al panel
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>
            {articleId === 'new' ? 'Artículo nuevo' : 'Editar artículo'}
            {lastSaved && autoSaveStatus !== 'error' && (
              <span className="text-xs text-muted" style={{ marginLeft: '12px' }}>
                · {autoSaveStatus === 'saving' ? 'Guardando…' : `Guardado a las ${lastSaved.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            )}
            {autoSaveStatus === 'error' && (
              <span className="text-xs" style={{ marginLeft: '12px', color: '#ef4444' }} title={autoSaveError || 'Error de autosave'}>
                · Error al guardar
              </span>
            )}
          </h1>
        </div>
        <div className="flex" style={{ gap: '8px' }}>
          <button
            onClick={() => setPreviewOpen(true)}
            className="btn-secondary"
            title="Abre una vista previa del artículo tal como se vería en el sitio público"
          >
            👁 Vista previa
          </button>
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="btn-secondary"
            title="Modo enfoque (oculta las distracciones del panel lateral)"
          >
            {focusMode ? '🔍 Salir del modo enfoque' : '🔍 Modo enfoque'}
          </button>
          <button
            onClick={() => handleSave()}
            className="btn-primary"
            disabled={saving}
            title="Guardar artículo (atajo: Ctrl+S)"
          >
            {saving ? 'Guardando…' : '💾 Guardar'}
          </button>
          {articleId !== 'new' && (
            <button
              onClick={handlePublish}
              className="btn-success"
              disabled={publishing || saving}
              title="Publicar en sitios seleccionados"
            >
              {publishing ? 'Publicando…' : '🚀 Publicar'}
            </button>
          )}
          {articleId !== 'new' && (
            <button
              onClick={handleDelete}
              className="btn-danger"
              disabled={deleting}
              title="Elimina este artículo de forma permanente"
            >
              {deleting ? 'Eliminando…' : '🗑 Eliminar'}
            </button>
          )}
        </div>
      </header>

      <main className="dashboard-content">
        <div className="editor-container">
          <div className="editor-main">
            <div className="card" style={{ marginBottom: '16px' }}>
              <input
                type="text"
                className="editor-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Escribe el título del artículo"
              />
              <div className="slug-input">
                <label>URL amigable: </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="titulo-del-articulo"
                  style={{ width: '300px', display: 'inline-block' }}
                />
                <span className="text-xs text-muted" style={{ marginLeft: '12px' }}>
                  {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'} · {charCount} {charCount === 1 ? 'carácter' : 'caracteres'} · {readingMin} {readingMin === 1 ? 'minuto' : 'minutos'} de lectura
                </span>
              </div>
            </div>

            <div className="card">
              <EditorToolbar editor={editor} cms={CMS_ID} />
              <EditorContent editor={editor} />
            </div>
          </div>

          <div className="editor-sidebar">
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '12px' }}>Detalles del artículo</h3>

              <label className="text-sm text-muted">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', marginBottom: '12px' }}
              >
                {['NACIONAL', 'LOCAL', 'SEGURIDAD', 'POLÍTICA', 'ECONOMÍA', 'SOCIAL', 'CULTURA', 'DEPORTES', 'INTERNACIONAL'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <label className="text-sm text-muted">URL de imagen destacada</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                style={{ width: '100%', marginBottom: '12px' }}
              />

              <label className="text-sm text-muted">Extracto / Descripción corta</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Resumen breve para SEO y tarjetas..."
                rows={3}
                style={{ width: '100%', marginBottom: '12px' }}
              />

              <label className="text-sm text-muted">Sitios de publicación</label>
              <div className="sites-grid">
                {availableSites.length === 0 && <span className="text-xs text-muted sites-grid-empty">Cargando sitios…</span>}
                {availableSites.map((site) => (
                  <label key={site.ID || site.id} className="site-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSites.includes(site.SLUG || site.slug)}
                      onChange={() => {
                        const slug = site.SLUG || site.slug
                        setSelectedSites((prev) =>
                          prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
                        )
                      }}
                    />
                    <span className="text-sm site-checkbox-label">{site.NOMBRE || site.nombre || site.SLUG || site.slug}</span>
                  </label>
                ))}
              </div>
            </div>

            <SeoPanel
              article={{
                title,
                slug,
                content: editor?.getHTML() || '',
                metaTitle,
                metaDescription,
                focusKeyword,
                tags,
              }}
              seoData={seoData}
              onUpdate={(updates) => {
                if (updates.metaTitle !== undefined) setMetaTitle(updates.metaTitle)
                if (updates.metaDescription !== undefined) setMetaDescription(updates.metaDescription)
                if (updates.focusKeyword !== undefined) setFocusKeyword(updates.focusKeyword)
              }}
            />

            <div className="card">
              <SerpPreview
                title={title}
                slug={slug}
                metaDescription={metaDescription}
                focusKeyword={focusKeyword}
                siteName={CMS_ID}
                siteBase={`${CMS_ID}.sebastianvernis.workers.dev`}
              />
            </div>

            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '12px' }}>Etiquetas</h3>
              <form onSubmit={handleAddTag} style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Escribe una etiqueta y presiona Enter…"
                />
              </form>
              <div className="flex" style={{ flexWrap: 'wrap', gap: '6px' }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="badge badge-secondary"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleRemoveTag(tag)}
                    title={`Quitar la etiqueta "${tag}"`}
                  >
                    {tag} ×
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ArticlePreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={title}
        category={category}
        author={article?.author || 'Redacción CMS'}
        imageUrl={imageUrl}
        metaDescription={metaDescription || excerpt}
        contentHtml={editor?.getHTML() || ''}
        siteName={CMS_ID}
      />

      {publishOpen && (
        <div className="modal-overlay" onClick={() => !publishing && setPublishOpen(false)}>
          <div className="modal publish-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Publicar artículo</h3>
                <p className="text-sm text-muted" style={{ marginTop: '4px' }}>{title || 'Sin título'}</p>
              </div>
              <button className="modal-close" onClick={() => setPublishOpen(false)} disabled={publishing} aria-label="Cerrar">✕</button>
            </div>

            <div className="modal-body">
              <p className="text-sm text-muted" style={{ marginBottom: '12px' }}>Seleccioná los sitios donde se publicará este artículo:</p>
              <div className="sites-grid">
                {availableSites.map((site) => {
                  const siteSlug = site.SLUG || site.slug
                  return (
                    <label key={site.ID || siteSlug} className="site-checkbox">
                      <input
                        type="checkbox"
                        checked={publishSites.includes(siteSlug)}
                        disabled={publishing}
                        onChange={() => togglePublishSite(siteSlug)}
                      />
                      <span className="text-sm site-checkbox-label">{site.NOMBRE || site.nombre || siteSlug}</span>
                    </label>
                  )
                })}
              </div>

              <label className="fb-publish-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={publishFB}
                  disabled={publishing}
                  onChange={(e) => setPublishFB(e.target.checked)}
                />
                <span className="text-sm">Publicar también en Facebook</span>
              </label>

              <div className="flex" style={{ marginTop: '20px', justifyContent: 'flex-end', gap: '8px' }}>
                <button className="btn-secondary" onClick={() => setPublishOpen(false)} disabled={publishing}>Cancelar</button>
                <button className="btn-success" onClick={confirmPublish} disabled={publishing || publishSites.length === 0}>
                  {publishing ? 'Publicando…' : 'Confirmar publicación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
