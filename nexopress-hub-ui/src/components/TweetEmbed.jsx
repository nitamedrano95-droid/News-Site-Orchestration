// src/components/TweetEmbed.jsx — Nodo TipTap atómico para incrustar
// publicaciones de X (Twitter). Se renderiza como <blockquote class="tweet-embed">
// en el editor, y como <blockquote class="twitter-tweet"> + carga diferida de
// widgets.js en la página pública.
//
// Por qué no usar insertContent('<blockquote>...<script>...</script>'):
// ProseMirror filtra <script> por seguridad y el <a> vacío rompe el parseo
// del blockquote. Usar un Node atómico con attrs {url} evita esos dos
// problemas y preserva el HTML en getHTML() / setContent().

import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'

// Validación de URL: aceptamos x.com / twitter.com / status / i.web URLs
const TWEET_URL_RE = /^https?:\/\/(www\.)?(twitter|x)\.com\/[\w./?=&-]+\/status(es)?\/\d+(\?[\w=&-]*)?$/i

function TweetEmbedView({ node, editor }) {
  const url = node.attrs.url || ''
  const isEditable = editor?.isEditable !== false

  const handleOpen = (e) => {
    e.preventDefault()
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleRemove = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (editor?.isEditable !== false) {
      editor.commands.deleteSelection()
    }
  }

  return (
    <NodeViewWrapper
      as="div"
      className="tweet-embed-wrapper"
      data-tweet-url={url}
      contentEditable={false}
      style={{
        position: 'relative',
        margin: '20px 0',
        padding: '14px 18px',
        borderLeft: '3px solid #1d9bf0',
        background: 'rgba(29, 155, 240, 0.06)',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#e7e9ea',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '16px' }}>🐦</span>
        <strong style={{ color: '#1d9bf0' }}>Publicación de X (Twitter)</strong>
        <span style={{ color: '#71767b', fontSize: '12px' }}>· embed</span>
      </div>
      <a
        href={url}
        onClick={handleOpen}
        style={{
          color: '#1d9bf0',
          textDecoration: 'none',
          wordBreak: 'break-all',
          display: 'block',
          marginTop: '4px',
        }}
      >
        {url}
      </a>
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#71767b' }}>
        El tweet se renderiza en el sitio público al cargar widgets.js.
      </div>
      {isEditable && (
        <button
          type="button"
          onClick={handleRemove}
          contentEditable={false}
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            background: 'transparent',
            color: '#f87171',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
          title="Quitar este embed"
        >
          ✕
        </button>
      )}
    </NodeViewWrapper>
  )
}

export const TweetEmbed = Node.create({
  name: 'tweetEmbed',
  group: 'block',
  atom: true,                // se trata como una unidad (no editable adentro)
  selectable: true,          // permite seleccionarlo para borrarlo
  draggable: false,

  addAttributes() {
    return {
      url: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-tweet-url') || el.getAttribute('href') || '',
        renderHTML: (attrs) => ({ 'data-tweet-url': attrs.url || '' }),
      },
    }
  },

  parseHTML() {
    // Al re-hidratar desde el HTML guardado, reconoce tanto el wrapper
    // del editor (.tweet-embed-wrapper) como el blockquote del sitio público
    return [
      {
        tag: 'div.tweet-embed-wrapper',
        getAttrs: (el) => ({ url: el.getAttribute('data-tweet-url') || '' }),
      },
      {
        tag: 'blockquote.twitter-tweet a[href*="status"]',
        getAttrs: (el) => ({ url: el.getAttribute('href') || '' }),
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    // Salida que verá el sitio público: <blockquote class="twitter-tweet">
    // con un <a> que el widget de X reemplaza al cargar widgets.js.
    const url = node.attrs.url || ''
    return [
      'blockquote',
      mergeAttributes(HTMLAttributes, { class: 'twitter-tweet' }),
      ['a', { href: url }, url],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TweetEmbedView)
  },

  addCommands() {
    return {
      setTweetEmbed:
        (url) =>
        ({ commands }) => {
          if (!url || !TWEET_URL_RE.test(url)) {
            return false
          }
          return commands.insertContent({ type: this.name, attrs: { url } })
        },
    }
  },
})

// Helper exportado para que EditorToolbar.jsx pueda validar la URL
// antes de llamar al comando y mostrar un alert coherente.
export const isValidTweetUrl = (url) => {
  if (!url) return false
  return TWEET_URL_RE.test(url.trim())
}

// ── Nodo hermano: InstagramEmbed ──────────────────────────────────────
// Misma estrategia que TweetEmbed para evitar que ProseMirror filtre
// <script> y rompa el parseo del blockquote de Instagram.
const INSTAGRAM_URL_RE = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+\/?$/i

function InstagramEmbedView({ node, editor }) {
  const url = node.attrs.url || ''
  const isEditable = editor?.isEditable !== false

  const handleOpen = (e) => {
    e.preventDefault()
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }
  const handleRemove = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (editor?.isEditable !== false) {
      editor.commands.deleteSelection()
    }
  }

  return (
    <NodeViewWrapper
      as="div"
      className="instagram-embed-wrapper"
      data-instagram-url={url}
      contentEditable={false}
      style={{
        position: 'relative',
        margin: '20px 0',
        padding: '14px 18px',
        borderLeft: '3px solid #e1306c',
        background: 'rgba(225, 48, 108, 0.06)',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#e7e9ea',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '16px' }}>📷</span>
        <strong style={{ color: '#e1306c' }}>Publicación de Instagram</strong>
        <span style={{ color: '#71767b', fontSize: '12px' }}>· embed</span>
      </div>
      <a
        href={url}
        onClick={handleOpen}
        style={{
          color: '#e1306c',
          textDecoration: 'none',
          wordBreak: 'break-all',
          display: 'block',
          marginTop: '4px',
        }}
      >
        {url}
      </a>
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#71767b' }}>
        El post se renderiza en el sitio público al cargar embed.js de Instagram.
      </div>
      {isEditable && (
        <button
          type="button"
          onClick={handleRemove}
          contentEditable={false}
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            background: 'transparent',
            color: '#f87171',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
          title="Quitar este embed"
        >
          ✕
        </button>
      )}
    </NodeViewWrapper>
  )
}

export const InstagramEmbed = Node.create({
  name: 'instagramEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      url: {
        default: '',
        parseHTML: (el) =>
          el.getAttribute('data-instagram-url') ||
          el.getAttribute('data-instgrm-permalink') ||
          '',
        renderHTML: (attrs) => ({ 'data-instagram-url': attrs.url || '' }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div.instagram-embed-wrapper',
        getAttrs: (el) => ({ url: el.getAttribute('data-instagram-url') || '' }),
      },
      {
        tag: 'blockquote.instagram-media',
        getAttrs: (el) => ({ url: el.getAttribute('data-instgrm-permalink') || '' }),
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    const url = node.attrs.url || ''
    return [
      'blockquote',
      mergeAttributes(HTMLAttributes, {
        class: 'instagram-media',
        'data-instgrm-permalink': url,
        'data-instgrm-version': '14',
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(InstagramEmbedView)
  },
})

export const isValidInstagramUrl = (url) => {
  if (!url) return false
  return INSTAGRAM_URL_RE.test(url.split('?')[0].trim())
}
