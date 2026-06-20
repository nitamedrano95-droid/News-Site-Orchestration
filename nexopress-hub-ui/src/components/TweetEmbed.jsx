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

// helpers para normalizar el attr `tweet` (ahora string JSON plano)
const parseTweetAttr = (raw) => {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  return null
}

const serializeTweetAttr = (value) => {
  if (!value) return ''
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function TweetEmbedView({ node, editor }) {
  const url = node.attrs.url || ''
  const tweet = parseTweetAttr(node.attrs.tweet)
  const failed = node.attrs.failed || false
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

  const author = tweet?.author || {}
  const authorName = author.name || author.screen_name || author.user_name || ''
  const authorHandle = author.screen_name || author.user_name || ''
  const text = tweet?.text || ''
  const date = tweet?.created_at ? new Date(tweet.created_at) : null
  const dateStr = date && !isNaN(date.getTime())
    ? date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
    : null
  const media = Array.isArray(tweet?.media) ? tweet.media : []

  // fxtwitter / vxtwitter devuelven `media.all` con items { type, url, thumbnail_url }.
  // Aceptamos también `media.photos[]`, `media.videos[]`, `media.mos[]` por si la
  // respuesta viene en otra forma. Devolvemos siempre un array plano de items
  // normalizados: { kind: 'photo' | 'video' | 'gif', url, thumb }.
  const normalize = (m) => {
    if (!m) return null
    if (typeof m === 'string') return { kind: 'photo', url: m, thumb: m }
    const url = m.url || m.media_url_https || m.media_url || ''
    if (!url) return null
    const t = (m.type || '').toLowerCase()
    let kind = 'photo'
    if (t === 'video' || t === 'mp4') kind = 'video'
    else if (t === 'gif' || t === 'animated_gif' || t === 'animated_gifs') kind = 'gif'
    return { kind, url, thumb: m.thumbnail_url || m.preview_url || url }
  }

  let mediaItems = []
  if (Array.isArray(tweet?.media?.all)) {
    mediaItems = tweet.media.all.map(normalize).filter(Boolean)
  } else if (Array.isArray(tweet?.media_extended)) {
    mediaItems = tweet.media_extended.map(normalize).filter(Boolean)
  } else if (Array.isArray(tweet?.media)) {
    mediaItems = tweet.media.map(normalize).filter(Boolean)
  } else if (tweet?.media && typeof tweet.media === 'object') {
    const buckets = ['photos', 'videos', 'mos']
    for (const b of buckets) {
      if (Array.isArray(tweet.media[b])) {
        mediaItems.push(...tweet.media[b].map(normalize).filter(Boolean))
      }
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
        padding: '16px 18px',
        borderLeft: '3px solid #1d9bf0',
        background: '#0a0a0a',
        border: '1px solid rgba(29, 155, 240, 0.25)',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#e7e9ea',
        maxWidth: '560px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '18px' }}>🐦</span>
        <strong style={{ color: '#1d9bf0' }}>Publicación de X</strong>
        {dateStr && (
          <span style={{ color: '#71767b', fontSize: '12px', marginLeft: 'auto' }}>{dateStr}</span>
        )}
      </div>

      {tweet ? (
        <>
          {(authorName || authorHandle) && (
            <div style={{ marginBottom: '10px' }}>
              {authorName && <div style={{ fontWeight: 700, color: '#fff' }}>{authorName}</div>}
              {authorHandle && (
                <div style={{ color: '#71767b', fontSize: '12px' }}>@{authorHandle}</div>
              )}
            </div>
          )}
          {text && (
            <div style={{ marginBottom: '10px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{text}</div>
          )}
          {mediaItems.length > 0 && (
            <div
              className="tweet-media-grid"
              data-count={mediaItems.length}
              style={{
                display: 'grid',
                gridTemplateColumns:
                  mediaItems.length === 1 ? '1fr' :
                  mediaItems.length === 2 ? '1fr 1fr' :
                  '1fr 1fr',
                gap: '4px',
                marginTop: '6px',
                marginBottom: '10px',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              {mediaItems.slice(0, 4).map((m, i) => {
                const last = i === mediaItems.length - 1 && mediaItems.length > 4
                return (
                  <div
                    key={`${m.kind}-${i}`}
                    style={{
                      position: 'relative',
                      aspectRatio: m.kind === 'video' ? '16 / 9' : '1 / 1',
                      background: '#16181c',
                    }}
                  >
                    {m.kind === 'video' ? (
                      <video
                        src={m.url}
                        poster={m.thumb}
                        controls
                        preload="metadata"
                        playsInline
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <img
                        src={m.url}
                        alt={`Media ${i + 1} del tweet`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                    {m.kind === 'gif' && (
                      <span
                        aria-label="GIF"
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          padding: '1px 6px',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#fff',
                          background: 'rgba(0,0,0,0.65)',
                          borderRadius: '3px',
                          letterSpacing: '0.5px',
                        }}
                      >
                        GIF
                      </span>
                    )}
                    {last && (
                      <span
                        aria-label={`+${mediaItems.length - 4} más`}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(0,0,0,0.55)',
                          color: '#fff',
                          fontSize: '18px',
                          fontWeight: 700,
                        }}
                      >
                        +{mediaItems.length - 4}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
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
      )}

      {failed && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#f87171' }}>
          No se pudo resolver la previsualización. El tweet se mostrará en el sitio público al cargar widgets.js.
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '12px', color: '#71767b' }}>
        <a href={url} onClick={handleOpen} style={{ color: '#1d9bf0', textDecoration: 'none' }}>
          Ver en X ↗
        </a>
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
      // Datos enriquecidos (autor, texto, fecha, media) que devuelve el
      // endpoint /api/embeds/x. Guardamos como JSON string plano para evitar
      // que ProseMirror filtre attrs de tipo objeto al serializar.
      tweet: {
        default: '',
        parseHTML: (el) => {
          const raw = el.getAttribute('data-tweet')
          if (!raw) return ''
          try { return decodeURIComponent(raw) } catch { return raw }
        },
        renderHTML: (attrs) => {
          if (!attrs.tweet) return {}
          const raw = typeof attrs.tweet === 'string' ? attrs.tweet : JSON.stringify(attrs.tweet)
          return { 'data-tweet': encodeURIComponent(raw) }
        },
      },
      failed: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-tweet-failed') === '1',
        renderHTML: (attrs) =>
          attrs.failed ? { 'data-tweet-failed': '1' } : {},
      },
    }
  },

  parseHTML() {
    // Al re-hidratar desde el HTML guardado, reconoce tanto el wrapper
    // del editor (.tweet-embed-wrapper) como el blockquote del sitio público.
    // Importante: extrae también `tweet` (JSON encoded en data-tweet)
    // y `failed` para que el round-trip preserve la data enriquecida.
    return [
      {
        tag: 'div.tweet-embed-wrapper',
        getAttrs: (el) => {
          const dt = el.getAttribute('data-tweet')
          let tweet = null
          if (dt) {
            try { tweet = JSON.parse(decodeURIComponent(dt)) } catch (_) {}
          }
          return {
            url: el.getAttribute('data-tweet-url') || '',
            tweet,
            failed: el.getAttribute('data-tweet-failed') === '1',
          }
        },
      },
      {
        tag: 'blockquote.twitter-tweet',
        getAttrs: (el) => {
          const dt = el.getAttribute('data-tweet')
          let tweet = null
          if (dt) {
            try { tweet = JSON.parse(decodeURIComponent(dt)) } catch (_) {}
          }
          const link = el.querySelector('a[href*="status"]') || el.querySelector('a')
          return {
            url: el.getAttribute('data-tweet-url') || link?.getAttribute('href') || '',
            tweet,
            failed: el.getAttribute('data-tweet-failed') === '1',
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
      // Salida del nodo a HTML para getHTML() / vista previa / sitios públicos.
      //
      // Tres modos:
      //  A) attrs.tweet poblado (data enriquecida del backend):
      //     genera <blockquote class="twitter-tweet"> con la estructura
      //     nativa de X.com (p>texto</p>, &mdash; autor, fecha), y añade
      //     data-tweet con el JSON para que el hook expandEmbedsForPreview
      //     del Editor pueda expandir a una card visual completa.
      //  B) attrs.failed = true (fallback si el backend falló):
      //     genera <blockquote class="twitter-tweet"><p>URL</p></blockquote>
      //     y se deja que widgets.js de X.com lo hidrate en el sitio público.
      //  C) Solo URL (compatibilidad hacia atrás):
      //     mismo formato B para que widgets.js funcione.

      const url = node.attrs.url || ''
      const tweet = parseTweetAttr(node.attrs.tweet)
      const failed = !!node.attrs.failed

      const baseAttrs = {
        class: 'twitter-tweet',
        'data-tweet-url': url,
      }
      if (tweet) {
        try {
          baseAttrs['data-tweet'] = encodeURIComponent(serializeTweetAttr(tweet))
        } catch (_) { /* ignore */ }
      }
      if (failed) {
        baseAttrs['data-tweet-failed'] = '1'
      }

      const merged = mergeAttributes(HTMLAttributes, baseAttrs)

      if (tweet) {
        // Modo A: bloque enriquecido con texto, autor, fecha.
        const text = String(tweet.text || '').trim()
        const author = tweet.author || {}
        const authorName = author.name || author.user_name || ''
        const handle = author.screen_name || author.user_name || ''
        const tweetId = tweet.id || ''
        // Formateamos la fecha si viene created_timestamp (epoch seconds).
        let dateStr = ''
        if (tweet.created_timestamp) {
          try {
            const d = new Date(Number(tweet.created_timestamp) * 1000)
            if (!isNaN(d.getTime())) {
              const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
              dateStr = `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`
            }
          } catch (_) { /* ignore */ }
        }
        const lang = tweet.lang ? { lang: tweet.lang } : {}

        // Construimos el contenido: <p>texto</p>&mdash; Nombre (@handle) · fecha
        const content = [
          ['p', lang, text || url],
        ]
        // Si hay autor/fecha, añadimos el trailing &mdash; Autor (@handle) · fecha
        if (authorName || handle || dateStr) {
          content.push(' — ')
          if (authorName) {
            content.push(authorName)
            if (handle) {
              content.push(' (')
              content.push(['a', { href: `https://x.com/${handle}` }, `@${handle}`])
              content.push(')')
            }
          } else if (handle) {
            content.push(['a', { href: `https://x.com/${handle}` }, `@${handle}`])
          }
          if (dateStr) {
            content.push(' · ')
            content.push(dateStr)
          }
          if (tweetId) {
            const permalink = `https://x.com/${handle || 'i'}/status/${tweetId}`
            content.push(' ')
            content.push(['a', { href: permalink }, ''])
          }
        }

        return ['blockquote', merged, ...content]
      }

      // Modo B/C: blockquote mínimo que widgets.js sabe hidratar.
      return [
        'blockquote',
        merged,
        ['p', ['a', { href: url }, url]],
      ]
    },

  addNodeView() {
    return ReactNodeViewRenderer(TweetEmbedView)
  },

  addCommands() {
    return {
      setTweetEmbed: (urlOrAttrs) => (props) => {
        // Acepta string (compatibilidad) o { url, tweet, failed }
        let attrs = { url: '', tweet: null, failed: false }
        if (typeof urlOrAttrs === 'string') {
          attrs.url = urlOrAttrs
        } else if (urlOrAttrs && typeof urlOrAttrs === 'object') {
          attrs = {
            url: urlOrAttrs.url || '',
            tweet: urlOrAttrs.tweet || null,
            failed: !!urlOrAttrs.failed,
          }
        }
        if (!attrs.url || !TWEET_URL_RE.test(attrs.url)) {
          return false
        }

        const { commands } = props || {}
        // Insertar UN solo nodo con la data completa. El toolbar
        // siempre hace fetch ANTES de llamar a este command, así
        // que attrs.tweet puede ser null (fallo del backend) o un
        // objeto (éxito). Nunca insertamos un placeholder y luego
        // un duplicado.
        return commands.insertContent({ type: this.name, attrs })
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
// Acepta todas las formas reales de Instagram:
//   /p/<id>             (post clásico)
//   /<username>/p/<id>  (post con username en el path)
//   /reel/<id>          (reel singular)
//   /reels/<id>         (reel plural, 2024+)
//   /<username>/reel/<id>
//   /tv/<id>            (IGTV legacy)
//   /share/reel/<id>    (link de compartir)
//   /<username>/share/reel/<id>
const INSTAGRAM_URL_RE = /^https?:\/\/(www\.)?instagram\.com\/(?:[\w.]+\/)?(p|reels?|tv|share\/reel)\/[\w-]+\/?$/i

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
    // Extraemos el ID del post/reel/tv para construir el embed URL.
    // /p/ABC123/ → embed/captioned
    // /reel/ABC123/ → reel/ABC123/embed/
    const m = url.match(/instagram\.com\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]+)/i)
    const type = m ? m[1] : 'p'
    const id = m ? m[2] : ''
    const embedUrl = id
      ? (type.startsWith('reel')
          ? `https://www.instagram.com/reel/${id}/embed/`
          : `https://www.instagram.com/p/${id}/embed/`)
      : ''

    if (embedUrl) {
      return [
        'div',
        mergeAttributes(HTMLAttributes, {
          class: 'instagram-embed-wrapper',
          'data-instagram-url': url,
        }),
        ['iframe', {
          src: embedUrl,
          frameborder: '0',
          scrolling: 'no',
          allowtransparency: 'true',
          style: 'width:100%;aspect-ratio:4/5;height:auto;min-height:200px;border:0;display:block;background:#fafafa;',
        }],
      ]
    }

    // Fallback si no pudimos parsear el ID
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
