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
import { TweetEmbed, InstagramEmbed } from '../components/TweetEmbed'
import SerpPreview from '../components/SerpPreview'
import ArticlePreview from '../components/ArticlePreview'
import { API_BASE } from '../main.jsx'

const lowlight = createLowlight(common)

// expandEmbedsForPreview(html)
// Expande los nodos tweetEmbed / instagramEmbed serializados como
// <blockquote class="twitter-tweet" data-tweet="<JSON encoded>">
// a un HTML enriquecido con la media incrustada, para que se vea
// en la vista previa del editor sin necesidad de widgets.js.
//
// - Para tweets: extrae `tweet.media.all` (fotos y videos) y los renderiza
//   como <img> / <video>. Si no hay media, devuelve el bloque original.
// - Para Instagram: si el attr `html` está presente, lo inyecta.
//   Si no, deja el <blockquote class="instagram-media"> intacto para que
//   el script de Instagram lo reemplace.
function expandEmbedsForPreview(html) {
  if (!html || typeof html === 'undefined') return html || ''

  const escAttr = (s) => String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 1) Tweets con data-tweet JSON
  html = html.replace(
    /<blockquote\b[^>]*class="twitter-tweet"[^>]*\bdata-tweet="([^"]+)"[^>]*>[\s\S]*?<\/blockquote>/gi,
    (full, encoded) => {
      let parsed = null
      try {
        parsed = JSON.parse(decodeURIComponent(encoded))
      } catch (_) {
        return full
      }
      const mediaRaw = Array.isArray(parsed?.media?.all)
        ? parsed.media.all
        : Array.isArray(parsed?.media)
        ? parsed.media
        : []
      // Nota: expandimos SIEMPRE que haya data-tweet JSON, aunque
      // el tweet no tenga media. Antes retornábamos `full` si
      // mediaRaw.length===0, lo que hacía que los tweets de solo
      // texto se quedaran como blockquote plano.

      const items = mediaRaw.slice(0, 4).map((m) => {
        const src = escAttr(m.url || m.media_url_https || m.media_url || '')
        if (!src) return ''
        const t = (m.type || '').toLowerCase()
        if (t === 'video' || t === 'mp4') {
          const variants = (m.video_info?.variants || []).filter((v) => v.content_type === 'video/mp4')
          const mp4 = escAttr(variants[0]?.url || src)
          const poster = escAttr(m.thumbnail_url || m.preview_url || src)
          return `<div class="np-x-media"><video controls preload="metadata" playsinline poster="${poster}" src="${mp4}" style="width:100%;display:block;border-radius:12px;"></video></div>`
        }
        return `<div class="np-x-media"><img src="${src}" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:100%;display:block;border-radius:12px;" /></div>`
      }).filter(Boolean).join('')

      if (!items) return full

      const author = parsed?.author || {}
      const authorName = escAttr(author.name || parsed?.user_name || '')
      const authorHandle = escAttr(author.screen_name || '')
      const avatar = escAttr(author.avatar_url || '')
      const text = escAttr(parsed?.text || '')
      const date = parsed?.created_at
        ? escAttr(new Date(parsed.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }))
        : ''

      const header = avatar || authorName
        ? `<div class="np-x-header" style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
             ${avatar ? `<img src="${avatar}" alt="" referrerpolicy="no-referrer" style="width:40px;height:40px;border-radius:50%;flex:0 0 auto;" />` : ''}
             <div style="flex:1;min-width:0;">
               ${authorName ? `<div style="font-weight:700;color:#fff;font-size:14px;">${authorName}</div>` : ''}
               ${authorHandle ? `<div style="color:#71767b;font-size:12px;">@${authorHandle}</div>` : ''}
             </div>
             ${date ? `<div style="color:#71767b;font-size:12px;">${date}</div>` : ''}
           </div>`
        : ''

      const textHtml = text
        ? `<div style="margin-bottom:10px;white-space:pre-wrap;line-height:1.4;color:#e7e9ea;font-size:14px;">${text}</div>`
        : ''

      const link = url
        ? `<div style="margin-top:6px;font-size:12px;"><a href="${escAttr(url)}" target="_blank" rel="noopener noreferrer" style="color:#1d9bf0;text-decoration:none;">${escAttr(url)}</a></div>`
        : ''

      return `<div class="tweet-embed-wrapper" data-tweet-url="${escAttr(parsed?.url || '')}" style="position:relative;margin:20px 0;padding:16px 18px;border-left:3px solid #1d9bf0;background:#0a0a0a;border:1px solid rgba(29,155,240,0.25);border-radius:8px;font-size:14px;color:#e7e9ea;max-width:560px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <span style="font-size:18px;">🐦</span>
          <strong style="color:#1d9bf0;">Publicación de X</strong>
        </div>
        ${header}
        ${textHtml}
        <div class="np-x-medias" style="display:grid;grid-template-columns:${mediaRaw.length === 1 ? '1fr' : '1fr 1fr'};gap:4px;margin-top:6px;border-radius:8px;overflow:hidden;">
          ${items}
        </div>
        ${link}
      </div>`
    }
  )

  // 2) Instagram (blockquote.class="instagram-media" con data-instgrm-permalink)
  html = html.replace(
    /<blockquote\b[^\u003e]*class="instagram-media"[^\u003e]*\bdata-instgrm-permalink="([^"]*)"[^\u003e]*>[\s\S]*?<\/blockquote>/gi,
    (full, permalink) => {
      const m = permalink.match(/instagram\.com\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]+)/i)
      const type = m ? m[1] : 'p'
      const id = m ? m[2] : ''
      if (!id) return full
      const embedUrl = type.startsWith('reel')
        ? `https://www.instagram.com/reel/${id}/embed/`
        : `https://www.instagram.com/p/${id}/embed/`
      return `<div class="instagram-embed-wrapper" style="position:relative;margin:20px 0;max-width:540px;">
        <iframe src="${embedUrl}" width="100%" height="480" frameborder="0" scrolling="no" allowtransparency="true" style="border:0;max-width:100%;display:block;background:#fafafa;"></iframe>
      </div>`
    }
  )

  return html
}

export default function Editor() {
  const { cms: cmsParam, articleId: articleIdParam } = useParams()
  // Fallback: la ruta standalone (/editor/:articleId) no trae :cms en params.
  // Usamos el prop o window.CMS_ID (inyectado en index.html) o import.meta.env.
  const cms = cmsParam || (typeof window !== 'undefined' && window.CMS_ID) || import.meta.env.VITE_CMS_ID || 'cms-originaux'
  const articleId = articleIdParam
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingMainImage, setUploadingMainImage] = useState(false)
  const [allSites, setAllSites] = useState([])
  const [activeSidebarTab, setActiveSidebarTab] = useState('seo')
  const [previewSiteSlug, setPreviewSiteSlug] = useState(null)
  const [selectedSites, setSelectedSites] = useState([])
  const [publishToFacebook, setPublishToFacebook] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Refs espejo para que el handleKeyDown del editor (que se registra una sola
  // vez al montar) lea los valores actuales sin necesidad de re-registrarse.
  const previewOpenRef = useRef(false)
  const deletingRef = useRef(false)
  const mainImageInputRef = useRef(null)
  useEffect(() => { previewOpenRef.current = previewOpen }, [previewOpen])
  useEffect(() => { deletingRef.current = deleting }, [deleting])

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
      TweetEmbed,
      InstagramEmbed,
      CharacterCount,
      CodeBlockLowlight.configure({ lowlight }),
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
    },
  })

  useEffect(() => {
    const handler = () => handleSave()
    document.addEventListener('editor-save', handler)
    return () => document.removeEventListener('editor-save', handler)
  }, [editor, article, title, slug, metaTitle, metaDescription, focusKeyword, tags])

  useEffect(() => {
    if (articleId !== 'new') fetchArticle()
    else setLoading(false)
  }, [cms, articleId])

  useEffect(() => {
    const loadSites = async () => {
      try {
        const token = localStorage.getItem('cms_token')
        const res = await fetch(`${API_BASE}/sites`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setAllSites(data)
        }
      } catch (err) {
        console.error('Error al cargar sitios:', err)
      }
    }
    loadSites()
  }, [cms])

  // Sincroniza previewSiteSlug con la lista de sitios y los seleccionados.
  // - Si hay sitios y el slug actual ya no existe, ajustar al primero.
  // - Si no hay selección manual y hay sitios, tomar el primero de selectedSites,
  //   o el primero de allSites como fallback.
  useEffect(() => {
    if (allSites.length === 0) {
      if (previewSiteSlug !== null) setPreviewSiteSlug(null)
      return
    }
    const validSlugs = allSites.map((s) => s.SLUG || s.id).filter(Boolean)
    if (previewSiteSlug && !validSlugs.includes(previewSiteSlug)) {
      setPreviewSiteSlug(validSlugs[0])
    } else if (!previewSiteSlug) {
      const firstAssigned = selectedSites.find((s) => validSlugs.includes(s))
      setPreviewSiteSlug(firstAssigned || validSlugs[0])
    }
  }, [allSites, selectedSites])

  const handleMainImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('La imagen no puede pesar más de 20 MB.')
      return
    }
    setUploadingMainImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const token = localStorage.getItem('cms_token')
      const res = await fetch(`https://${cms}.sebastianvernis.workers.dev/api/images/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setImageUrl(data.url || data.imageUrl || '')
    } catch (err) {
      alert('Error al subir la imagen: ' + err.message)
    } finally {
      setUploadingMainImage(false)
      if (mainImageInputRef.current) mainImageInputRef.current.value = ''
    }
  }

  const fetchArticle = async () => {
    const token = localStorage.getItem('cms_token')
    try {
      const res = await fetch(`${API_BASE}/articles/id/${articleId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('No se encontró el artículo solicitado')
      const resJson = await res.json()
      const data = resJson.article || resJson
      setArticle(data)
      setTitle(data.title || '')
      setSlug(data.slug || '')
      setImageUrl(data.imageUrl || '')
      setMetaTitle(data.metaTitle || '')
      setMetaDescription(data.metaDescription || '')
      setFocusKeyword(data.focusKeyword || '')
      setTags(data.tags || [])
      setSelectedSites(
        typeof data.site === 'string'
          ? data.site.split(',').map((s) => s.trim()).filter(Boolean)
          : []
      )
      setPublishToFacebook(data.fbRequired || data.FB_REQUERIDO || false)
      // El contenido se inyecta en el editor vía useEffect (loadedArticleIdRef)
      setSeoData({ article: data })
      await fetchSeoAnalysis(articleId)
    } catch (err) {
      console.error('Error al cargar el artículo:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSeoAnalysis = async (id) => {
    const token = localStorage.getItem('cms_token')
    try {
      const res = await fetch(`${API_BASE}/articles/${id}/seo`, {
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

  const handleSave = useCallback(async () => {
    if (!editor || saving) return
    setSaving(true)

    const token = localStorage.getItem('cms_token')
    const content = editor.getHTML()

    const payload = {
      title,
      slug,
      content,
      imageUrl,
      metaTitle,
      metaDescription,
      focusKeyword,
      tags,
      sites: selectedSites,
      fbRequired: publishToFacebook,
    }

    try {
      const url = articleId === 'new'
        ? `${API_BASE}/articles`
        : `${API_BASE}/articles/${articleId}`

      const method = articleId === 'new' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
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
      if (articleId === 'new' && saved.id) {
        navigate(`/editor/${saved.id}`)
      } else if (saved.id) {
        await fetchSeoAnalysis(saved.id)
      }
    } catch (err) {
      console.error('Error al guardar:', err)
      alert(`No se pudo guardar el artículo: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }, [editor, saving, cms, articleId, title, slug, metaTitle, metaDescription, focusKeyword, tags, selectedSites, publishToFacebook, navigate])

  const handleDelete = useCallback(async () => {
    if (articleId === 'new' || deleting) return
    const displayTitle = (title || article?.title || 'este artículo').slice(0, 80)
    const ok = window.confirm(
      `¿Eliminar "${displayTitle}"?\n\nEsta acción no se puede deshacer. El artículo se borrará del CMS y de cualquier sitio donde esté publicado.`
    )
    if (!ok) return
    setDeleting(true)
    const token = localStorage.getItem('cms_token')
    try {
      const res = await fetch(`${API_BASE}/articles/${articleId}`, {
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
  }, [articleId, article, cms, deleting, navigate, title])

  const handleDiscard = useCallback(() => {
    const ok = window.confirm(
      `¿Descartar el artículo en progreso?\n\nSi ya guardaste algo, no se eliminará, pero saldrás del editor sin guardar los cambios nuevos.`
    )
    if (!ok) return
    navigate('/')
  }, [navigate])

  const handlePublish = useCallback(async () => {
    if (publishing) return
    if (selectedSites.length === 0) {
      alert('Selecciona al menos un sitio de publicación antes de publicar.')
      return
    }
    // Confirmar si también se publica en Facebook (los sitios ya están
    // asignados en la pestaña "Sitios" del sidebar).
    const goFb = window.confirm(
      '¿Publicar también en Facebook?\n\nAceptar = sí (se respetan las reglas de frecuencia y ventana horaria).\nCancelar = solo sitios web.'
    )
    setPublishToFacebook(goFb)
    setPublishing(true)
    const token = localStorage.getItem('cms_token')
    try {
      // 1. Asegurarse de tener un id (guardar primero si es nuevo)
      let id = articleId
      if (id === 'new') {
        const content = editor.getHTML()
        const saveRes = await fetch(`${API_BASE}/articles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            title, slug, content, imageUrl,
            metaTitle, metaDescription, focusKeyword, tags,
            sites: selectedSites,
            fbRequired: goFb,
          }),
        })
        if (!saveRes.ok) {
          const err = await saveRes.json().catch(() => ({}))
          throw new Error(err.error || 'No se pudo guardar el borrador antes de publicar.')
        }
        const saved = await saveRes.json()
        id = saved.article?.id || saved.id
      }

      // 2. Llamar al endpoint publish
      const content = editor.getHTML()
      const res = await fetch(`${API_BASE}/cms/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          sitios: selectedSites,
          fb_requerido: goFb,
          title,
          slug,
          content,
          category: article?.category,
          imageUrl,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'No se pudo publicar el artículo.')
      }

      const result = await res.json().catch(() => ({}))
      alert(
        result.message ||
          `Artículo publicado en ${selectedSites.length} sitio(s)${goFb ? ' y enviado a Facebook' : ''}.`
      )
      // Redirigir al artículo ya publicado
      navigate(`/editor/${id}`)
    } catch (err) {
      console.error('Error al publicar:', err)
      alert(`No se pudo publicar el artículo: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }, [publishing, articleId, editor, selectedSites, cms, article, title, slug, imageUrl, metaTitle, metaDescription, focusKeyword, tags, navigate])

  // Sincronizar el contenido del editor cuando llega el artículo del backend.
  // Se hace en useEffect separado para evitar que el editor se recree en cada
  // cambio de estado (lo que resetea el contenido a '').
  const loadedArticleIdRef = useRef(null)
  useEffect(() => {
    if (!editor || !article || loadedArticleIdRef.current === article.id) return
    const currentHtml = editor.getHTML()
    if (article.content && currentHtml !== article.content) {
      editor.commands.setContent(article.content, false)
    }
    loadedArticleIdRef.current = article.id
  }, [editor, article?.id, article?.content])

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
            {lastSaved && (
              <span className="text-xs text-muted" style={{ marginLeft: '12px' }}>
                · Guardado a las {lastSaved.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
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
            onClick={handleSave}
            className="btn-primary"
            disabled={saving}
            title="Guardar artículo (atajo: Ctrl+S)"
          >
            {saving ? 'Guardando…' : '💾 Guardar'}
          </button>
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
          {articleId === 'new' && (
            <button
              onClick={handleDiscard}
              className="btn-danger"
              title="Descarta el artículo en progreso y vuelve al panel"
            >
              🗑 Descartar
            </button>
          )}
          <button
            onClick={handlePublish}
            className="btn-primary"
            disabled={publishing || saving}
            title="Publica el artículo en los sitios seleccionados (pestaña Sitios)"
            style={{ background: '#16a34a' }}
          >
            {publishing ? 'Publicando…' : '🚀 Publicar'}
          </button>
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
              <EditorToolbar editor={editor} cms={cms} />
              <EditorContent editor={editor} />
            </div>
          </div>

          <div className="editor-sidebar">
            <div className="card sidebar-tabs-card">
              <div className="sidebar-tabs" role="tablist" aria-label="Paneles del editor">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSidebarTab === 'seo'}
                  aria-controls="sidebar-panel-seo"
                  id="sidebar-tab-seo"
                  className={`sidebar-tab ${activeSidebarTab === 'seo' ? 'active' : ''}`}
                  onClick={() => setActiveSidebarTab('seo')}
                >
                  <span className="sidebar-tab-icon" aria-hidden="true">🔎</span>
                  <span>SEO</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSidebarTab === 'image'}
                  aria-controls="sidebar-panel-image"
                  id="sidebar-tab-image"
                  className={`sidebar-tab ${activeSidebarTab === 'image' ? 'active' : ''}`}
                  onClick={() => setActiveSidebarTab('image')}
                >
                  <span className="sidebar-tab-icon" aria-hidden="true">🖼</span>
                  <span>Imagen</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSidebarTab === 'preview'}
                  aria-controls="sidebar-panel-preview"
                  id="sidebar-tab-preview"
                  className={`sidebar-tab ${activeSidebarTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveSidebarTab('preview')}
                >
                  <span className="sidebar-tab-icon" aria-hidden="true">👁</span>
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSidebarTab === 'sites'}
                  aria-controls="sidebar-panel-sites"
                  id="sidebar-tab-sites"
                  className={`sidebar-tab ${activeSidebarTab === 'sites' ? 'active' : ''}`}
                  onClick={() => setActiveSidebarTab('sites')}
                >
                  <span className="sidebar-tab-icon" aria-hidden="true">🌐</span>
                  <span>Sitios</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSidebarTab === 'tags'}
                  aria-controls="sidebar-panel-tags"
                  id="sidebar-tab-tags"
                  className={`sidebar-tab ${activeSidebarTab === 'tags' ? 'active' : ''}`}
                  onClick={() => setActiveSidebarTab('tags')}
                >
                  <span className="sidebar-tab-icon" aria-hidden="true">🏷</span>
                  <span>Etiquetas</span>
                </button>
              </div>

              <div
                role="tabpanel"
                id="sidebar-panel-seo"
                aria-labelledby="sidebar-tab-seo"
                hidden={activeSidebarTab !== 'seo'}
                className="sidebar-tab-panel"
              >
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
              </div>

              <div
                role="tabpanel"
                id="sidebar-panel-image"
                aria-labelledby="sidebar-tab-image"
                hidden={activeSidebarTab !== 'image'}
                className="sidebar-tab-panel"
              >
                <h3 className="card-title" style={{ marginBottom: '12px' }}>Imagen destacada</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... o sube un archivo"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ whiteSpace: 'nowrap' }}
                    onClick={() => mainImageInputRef.current?.click()}
                    disabled={uploadingMainImage}
                  >
                    {uploadingMainImage ? 'Subiendo…' : '📤 Subir'}
                  </button>
                  <input
                    ref={mainImageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleMainImageUpload}
                  />
                </div>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Vista previa"
                    style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '6px' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}
              </div>

              <div
                role="tabpanel"
                id="sidebar-panel-preview"
                aria-labelledby="sidebar-tab-preview"
                hidden={activeSidebarTab !== 'preview'}
                className="sidebar-tab-panel"
              >
                <SerpPreview
                  title={title}
                  slug={slug}
                  metaDescription={metaDescription}
                  focusKeyword={focusKeyword}
                  siteName={cms}
                  siteBase={
                    (() => {
                      const site = allSites.find((s) => (s.SLUG || s.id) === previewSiteSlug)
                      if (site && site.DOMINIO) return site.DOMINIO
                      return previewSiteSlug
                        ? `${previewSiteSlug}.sebastianvernis.workers.dev`
                        : `${cms}.sebastianvernis.workers.dev`
                    })()
                  }
                />
              </div>

              <div
                role="tabpanel"
                id="sidebar-panel-sites"
                aria-labelledby="sidebar-tab-sites"
                hidden={activeSidebarTab !== 'sites'}
                className="sidebar-tab-panel"
              >
                <h3 className="card-title" style={{ marginBottom: '8px' }}>Sitios de publicación</h3>
                <p className="text-muted" style={{ fontSize: '12px', marginBottom: '12px' }}>
                  Selecciona dónde se publicará este artículo y, opcionalmente, qué sitio usar
                  como referencia en la vista previa.
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <label
                    htmlFor="preview-site-select"
                    style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}
                  >
                    Sitio para la vista previa
                  </label>
                  <select
                    id="preview-site-select"
                    value={previewSiteSlug || ''}
                    onChange={(e) => setPreviewSiteSlug(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'inherit',
                      fontSize: '14px',
                    }}
                  >
                    {allSites.length === 0 && (
                      <option value="">Cargando sitios…</option>
                    )}
                    {allSites.map((site) => {
                      const slug = site.SLUG || site.id
                      return (
                        <option key={slug} value={slug}>
                          {site.NOMBRE || slug}
                          {site.DOMINIO ? ` — ${site.DOMINIO}` : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    Asignar a sitios
                  </div>
                  <div className="sites-assign-grid">
                    {allSites.length === 0 && (
                      <p className="text-muted" style={{ fontSize: '13px' }}>Cargando sitios…</p>
                    )}
                    {allSites.map((site) => {
                      const slug = site.SLUG || site.id
                      const checked = selectedSites.includes(slug)
                      return (
                        <label
                          key={slug}
                          className={`site-assign-cell ${checked ? 'checked' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSites([...selectedSites, slug])
                              } else {
                                setSelectedSites(selectedSites.filter((s) => s !== slug))
                              }
                            }}
                          />
                          <span className="site-assign-name">
                            {site.NOMBRE || site.name || slug}
                          </span>
                          {site.DOMINIO && (
                            <span className="site-assign-domain">
                              {site.DOMINIO}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                  {selectedSites.length === 0 && (
                    <p className="text-muted" style={{ fontSize: '12px', marginTop: '8px' }}>
                      Ningún sitio seleccionado. El artículo se guardará como borrador.
                    </p>
                  )}
                </div>
              </div>

              <div
                role="tabpanel"
                id="sidebar-panel-tags"
                aria-labelledby="sidebar-tab-tags"
                hidden={activeSidebarTab !== 'tags'}
                className="sidebar-tab-panel"
              >
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
        </div>
      </main>

      <ArticlePreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={title}
        category={article?.category}
        author={article?.author}
        imageUrl={imageUrl}
        metaDescription={metaDescription}
        contentHtml={expandEmbedsForPreview(editor?.getHTML() || '')}
        siteName={cms}
      />
    </div>
  )
}
