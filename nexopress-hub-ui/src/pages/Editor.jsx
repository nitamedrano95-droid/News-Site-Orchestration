import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import SeoPanel from '../components/SeoPanel'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const MenuBar = ({ editor }) => {
  if (!editor) return null

  return (
    <div className="editor-toolbar">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
      >
        Negrita
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
      >
        Cursiva
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
      >
        H3
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''}
      >
        • Lista
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'is-active' : ''}
      >
        1. Lista
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'is-active' : ''}
      >
        Cita
      </button>
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        ↶ Deshacer
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        ↷ Rehacer
      </button>
    </div>
  )
}

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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Escribí tu artículo acá... Usá H2 para separar secciones.',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-trigger SEO analysis on content change
      if (article) {
        analyzeSeo({ ...article, content: editor.getHTML() })
      }
    },
  })

  useEffect(() => {
    if (articleId === 'new') {
      setLoading(false)
      return
    }

    fetchArticle()
  }, [cms, articleId])

  const fetchArticle = async () => {
    const token = localStorage.getItem('hub_token')
    try {
      const res = await fetch(`${API_BASE}/cms/${cms}/articles/${articleId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Article not found')
      const data = await res.json()
      setArticle(data)
      setTitle(data.title || '')
      setSlug(data.slug || '')
      setMetaTitle(data.metaTitle || '')
      setMetaDescription(data.metaDescription || '')
      setFocusKeyword(data.focusKeyword || '')
      setTags(data.tags || [])
      editor?.commands.setContent(data.content || '')
      analyzeSeo(data)
    } catch (err) {
      console.error('Failed to fetch article:', err)
    } finally {
      setLoading(false)
    }
  }

  const analyzeSeo = (articleData) => {
    setSeoData({
      article: articleData,
      readability: null, // Will be computed by SeoPanel
      focusKeywordAnalysis: null,
    })
  }

  const handleAddTag = (e) => {
    e.preventDefault()
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSave = async () => {
    if (!editor) return
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
        throw new Error(err.error || 'Save failed')
      }

      const saved = await res.json()
      
      // If new article, redirect to edit URL
      if (articleId === 'new' && saved.id) {
        navigate(`/editor/${cms}/${saved.id}`)
      }

      // Update SEO data
      await fetchSeoAnalysis(saved.id || articleId)
    } catch (err) {
      console.error('Failed to save article:', err)
      alert(`Error al guardar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const fetchSeoAnalysis = async (id) => {
    const token = localStorage.getItem('hub_token')
    try {
      const res = await fetch(`${API_BASE}/cms/${cms}/articles/${id}/seo`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setSeoData(data)
    } catch (err) {
      console.error('Failed to fetch SEO analysis:', err)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-content">
        <p className="text-muted">Cargando artículo...</p>
      </div>
    )
  }

  return (
    <div>
      <header className="dashboard-header flex-between">
        <div>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary text-sm"
            style={{ marginBottom: '8px' }}
          >
            ← Volver
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: '600' }}>
            {articleId === 'new' ? 'Nuevo Artículo' : 'Editar Artículo'}
          </h1>
        </div>
        <div className="flex">
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar'}
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
                placeholder="Título del artículo"
              />
              <div className="slug-input">
                <label>Slug: </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="titulo-del-articulo"
                  style={{ width: '300px', display: 'inline-block' }}
                />
              </div>
            </div>

            <div className="card">
              <MenuBar editor={editor} />
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
                if (updates.metaTitle) setMetaTitle(updates.metaTitle)
                if (updates.metaDescription) setMetaDescription(updates.metaDescription)
                if (updates.focusKeyword) setFocusKeyword(updates.focusKeyword)
              }}
            />

            <div className="card">
              <h3 className="card-title" style={{ marginBottom: '12px' }}>Etiquetas</h3>
              <form onSubmit={handleAddTag} style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Agregar etiqueta..."
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
