import { useEffect, useState, useCallback } from 'react'
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
import { API_BASE } from '../main.jsx'

const lowlight = createLowlight(common)

export default function Editor() {
  const { cms, articleId } = useParams()
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

  const fetchArticle = async () => {
    const token = localStorage.getItem('hub_token')
    try {
      const res = await fetch(`${API_BASE}/cms/${cms}/articles/${articleId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('No se encontró el artículo solicitado')
      const data = await res.json()
      setArticle(data)
      setTitle(data.title || '')
      setSlug(data.slug || '')
      setMetaTitle(data.metaTitle || '')
      setMetaDescription(data.metaDescription || '')
      setFocusKeyword(data.focusKeyword || '')
      setTags(data.tags || [])
      editor?.commands.setContent(data.content || '')
      setSeoData({ article: data })
      await fetchSeoAnalysis(articleId)
    } catch (err) {
      console.error('Error al cargar el artículo:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSeoAnalysis = async (id) => {
    const token = localStorage.getItem('hub_token')
    try {
      const res = await fetch(`${API_BASE}/cms/${cms}/articles/${id}/seo`, {
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

    const token = localStorage.getItem('hub_token')
    const content = editor.getHTML()

    const payload = {
      title,
      slug,
      content,
      metaTitle,
      metaDescription,
      focusKeyword,
      tags,
    }

    try {
      const url = articleId === 'new'
        ? `${API_BASE}/cms/${cms}/articles`
        : `${API_BASE}/cms/${cms}/articles/${articleId}`

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
        navigate(`/editor/${cms}/${saved.id}`)
      } else if (saved.id) {
        await fetchSeoAnalysis(saved.id)
      }
    } catch (err) {
      console.error('Error al guardar:', err)
      alert(`No se pudo guardar el artículo: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }, [editor, saving, cms, articleId, title, slug, metaTitle, metaDescription, focusKeyword, tags, navigate])

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
    </div>
  )
}
