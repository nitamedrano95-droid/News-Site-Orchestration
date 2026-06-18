import { useEffect, useRef, useState } from 'react'
import Tooltip from './Tooltip.jsx'
import InternalLinkDialog from './InternalLinkDialog.jsx'
import { isValidTweetUrl, isValidInstagramUrl } from './TweetEmbed.jsx'

/**
 * Barra de herramientas del editor NexoPress Hub.
 *
 * Replica las herramientas del editor clásico de los CMSs (imagen, YouTube,
 * Twitter, Instagram, columnas, tablas, citas) y agrega un conjunto ampliado
 * de utilidades editoriales: letra capital, cita destacada, callouts, modo
 * enfoque, atajos de teclado, etc.
 *
 * Todos los textos visibles están en español de México (tuteo neutro).
 * Cada botón envuelve su contenido con un Tooltip que muestra descripción
 * breve y atajo de teclado cuando aplica.
 */
export default function EditorToolbar({ editor, cms, onUploadImage }) {
  const fileInputRef = useRef(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [embedUrl, setEmbedUrl] = useState('')
  const [showEmbedInput, setShowEmbedInput] = useState(null) // 'youtube' | 'twitter' | 'instagram'

  if (!editor) return null

  // === SUBIR IMAGEN DESDE DISCO =========================================
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      alert('La imagen es demasiado pesada. El peso máximo permitido es de 20 MB.')
      return
    }
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('cms_token')
    try {
      const res = await fetch(`https://${cms}.sebastianvernis.workers.dev/api/images/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run()
      } else {
        alert('No se pudo subir la imagen. Verifica tu conexión e inténtalo de nuevo.')
      }
    } catch (err) {
      alert('Error al subir la imagen: ' + err.message)
    }
  }

  const handleImageFromUrl = () => {
    const url = prompt('Pega la URL de la imagen que quieres insertar:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  // === EMBEDS: YOUTUBE / TWITTER / INSTAGRAM =============================
  const submitEmbed = () => {
    const url = embedUrl.trim()
    if (!url) return
    if (showEmbedInput === 'youtube') {
      // TipTap: usar la extensión oficial YouTube si está disponible
      const YoutubeExt = editor.extensionManager.extensions.find((e) => e.name === 'youtube')
      if (YoutubeExt) {
        editor.chain().focus().setYoutubeVideo({ src: url, width: 640, height: 360 }).run()
      } else {
        const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
        if (m) {
          const id = m[1]
          editor.chain().focus().insertContent(
            `<div class="video-container"><iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe></div>`
          ).run()
        } else {
          alert('La URL de YouTube no es válida. Asegúrate de pegar un enlace completo.')
          return
        }
      }
    } else if (showEmbedInput === 'twitter') {
      // Nodo atómico TweetEmbed: ProseMirror rechaza <script> por seguridad
      // y el <a> vacío rompía el parseo del <blockquote>. El nodo se
      // serializa como <blockquote class="twitter-tweet"><a>URL</a></blockquote>
      // para que el sitio público cargue widgets.js.
      if (!isValidTweetUrl(url)) {
        alert('La URL no parece un tuit válido. Pega un enlace del tipo https://x.com/usuario/status/1234567890')
        return
      }
      const ok = editor.chain().focus().setTweetEmbed(url).run()
      if (!ok) {
        alert('No se pudo insertar el tuit. Revisa la consola para más detalles.')
      }
    } else if (showEmbedInput === 'instagram') {
      // Mismo patrón: nodo atómico para no meter <script>/<iframe> en ProseMirror.
      // Se renderiza como <blockquote class="instagram-media"> con data-instgrm-permalink
      // y el sitio público carga embed.js al final del <body>.
      const cleanUrl = url.split('?')[0]
      if (!isValidInstagramUrl(cleanUrl)) {
        alert('La URL de Instagram no es válida. Pega un enlace de post, reel o TV.')
        return
      }
      const ok = editor.chain().focus().insertContent({
        type: 'instagramEmbed',
        attrs: { url: cleanUrl },
      }).run()
      if (!ok) {
        alert('No se pudo insertar el post de Instagram. Revisa la consola.')
      }
    }
    setEmbedUrl('')
    setShowEmbedInput(null)
  }

  // === ENLACE ============================================================
  const handleLink = () => {
    // Abre el dialog modal (con tabs interno/externo).
    setShowLinkDialog(true)
  }

  // === ANCHOR LINKS =====================================================
  const slugifyHeading = (text) => {
    return (text || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quitar diacríticos
      .replace(/[^a-z0-9\s-]/g, '') // solo alfanum + espacios + guiones
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60)
  }

  const anchorSelectedHeading = () => {
    if (!editor) return
    // Detectar si el cursor está en un heading
    const { $from } = editor.state.selection
    const parent = $from.parent
    const headingLevels = [1, 2, 3, 4, 5, 6]
    const isInHeading =
      parent.type.name === 'heading' && headingLevels.includes(parent.attrs.level)

    if (!isInHeading) {
      alert('Coloca el cursor dentro de un encabezado (H1, H2 o H3) para anclarlo.')
      return
    }

    const baseId = slugifyHeading(parent.textContent)
    if (!baseId) {
      alert('El encabezado no tiene texto para generar un ancla.')
      return
    }

    // Asegurar unicidad: si ya existe un heading con el mismo id, agregar sufijo
    let id = baseId
    let n = 1
    const existing = new Set()
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading' && node.attrs.id) {
        existing.add(node.attrs.id)
      }
    })
    while (existing.has(id)) {
      n += 1
      id = `${baseId}-${n}`
    }

    // Aplicar el id al heading
    const pos = $from.before(1) // posición de inicio del nodo
    const node = editor.state.doc.nodeAt(pos)
    if (node && node.type.name === 'heading') {
      const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        id,
      })
      editor.view.dispatch(tr)
      // Copiar el #anchor al portapapeles para que el editor lo pegue en su link
      const anchorLink = `#${id}`
      try {
        navigator.clipboard.writeText(anchorLink)
      } catch (e) {
        // Fallback: prompt con el anchor
        prompt('Copia este ancla para enlazarla desde otro punto:', anchorLink)
      }
    }
  }

  // === NODOS EDITORIALES PERSONALIZADOS ==================================
  const insertCallout = (variant = 'info') => {
    const palette = {
      info:    { bg: '#1e3a8a', border: '#3b82f6', icon: 'ℹ️', label: 'Información' },
      warning: { bg: '#7c2d12', border: '#f97316', icon: '⚠️', label: 'Alerta' },
      success: { bg: '#14532d', border: '#16a34a', icon: '✅', label: 'Dato verificado' },
      tip:     { bg: '#581c87', border: '#a855f7', icon: '💡', label: 'Consejo' },
    }
    const p = palette[variant] || palette.info
    const html = `<aside class="callout callout-${variant}" style="background:${p.bg}1a; border-left:4px solid ${p.border}; padding:16px 20px; margin:20px 0; border-radius:6px;"><strong style="color:${p.border}">${p.icon} ${p.label}</strong><p>Escribe aquí el contenido del llamado de atención.</p></aside>`
    editor.chain().focus().insertContent(html).run()
  }

  const insertPullQuote = () => {
    const html = `<blockquote class="pull-quote" style="font-size:1.6em; line-height:1.3; font-weight:600; font-style:italic; border-left:4px solid var(--accent); padding:8px 0 8px 24px; margin:32px 0; color:var(--text-primary);">Escribe aquí una frase destacada que rompa el flujo del artículo.</blockquote>`
    editor.chain().focus().insertContent(html).run()
  }

  const insertDropCap = () => {
    const html = editor.getHTML()
    const m = html.match(/<p>([A-Za-zÁÉÍÓÚáéíóúñÑ¿¡])/)
    if (!m) {
      alert('No se encontró un párrafo inicial con letra capital para aplicar este formato.')
      return
    }
    const newHtml = html.replace(
      /<p>([A-Za-zÁÉÍÓÚáéíóúñÑ¿¡])/,
      '<p><span class="drop-cap" style="float:left; font-size:4.2em; line-height:0.9; font-weight:700; margin:6px 8px 0 0; color:var(--accent);">$1</span>'
    )
    editor.commands.setContent(newHtml)
  }

  const insertColumns2 = () => {
    editor.chain().focus().insertContent(
      `<div class="columns-2" style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:20px 0;"><div><p>Columna izquierda…</p></div><div><p>Columna derecha…</p></div></div>`
    ).run()
  }

  const insertColumns3 = () => {
    editor.chain().focus().insertContent(
      `<div class="columns-3" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin:20px 0;"><div><p>Columna 1…</p></div><div><p>Columna 2…</p></div><div><p>Columna 3…</p></div></div>`
    ).run()
  }

  // === ATAJOS DE TECLADO GLOBALES =======================================
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault()
          document.dispatchEvent(new CustomEvent('editor-save'))
        } else if (e.key === 'k' && !e.shiftKey) {
          e.preventDefault()
          handleLink()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [editor])

  return (
    <div className="editor-toolbar-new">
      <div className="toolbar-row">
        {/* === SELECCIÓN DE FORMATO === */}
        <Tooltip content="Cambia el tipo de bloque del párrafo: párrafo normal, título 1 (más grande), título 2 o título 3 (subtítulos).">
          <select
            className="toolbar-select"
            onChange={(e) => {
              const v = e.target.value
              if (v === 'p') editor.chain().focus().setParagraph().run()
              else if (v === '1') editor.chain().focus().toggleHeading({ level: 1 }).run()
              else if (v === '2') editor.chain().focus().toggleHeading({ level: 2 }).run()
              else if (v === '3') editor.chain().focus().toggleHeading({ level: 3 }).run()
              e.target.value = ''
            }}
          >
            <option value="">Formato</option>
            <option value="p">Párrafo</option>
            <option value="1">Título 1</option>
            <option value="2">Título 2</option>
            <option value="3">Título 3</option>
          </select>
        </Tooltip>

        <span className="toolbar-divider" />

        {/* === FORMATO BÁSICO DE TEXTO === */}
        <Tooltip content="Pone el texto seleccionado en negritas." shortcut="Ctrl+B">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'is-active' : ''}
          >
            <b>B</b>
          </button>
        </Tooltip>
        <Tooltip content="Pone el texto seleccionado en cursiva." shortcut="Ctrl+I">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'is-active' : ''}
          >
            <i>I</i>
          </button>
        </Tooltip>
        <Tooltip content="Subraya el texto seleccionado." shortcut="Ctrl+U">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={editor.isActive('underline') ? 'is-active' : ''}
          >
            <u>U</u>
          </button>
        </Tooltip>
        <Tooltip content="Tacha el texto seleccionado, útil para señalar correcciones o cambios.">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'is-active' : ''}
          >
            <s>S</s>
          </button>
        </Tooltip>
        <Tooltip content="Resalta el texto con un fondo amarillo. Útil para destacar frases clave.">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={editor.isActive('highlight') ? 'is-active' : ''}
          >
            🖊
          </button>
        </Tooltip>
        <Tooltip content="Marca el texto como código en línea, con estilo monoespaciado. Ideal para términos técnicos o comandos.">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={editor.isActive('code') ? 'is-active' : ''}
          >
            {'</>'}
          </button>
        </Tooltip>

        <span className="toolbar-divider" />

        {/* === ALINEACIÓN === */}
        <Tooltip content="Alinea el texto a la izquierda.">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
          >
            ≡⇤
          </button>
        </Tooltip>
        <Tooltip content="Centra el texto horizontalmente.">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
          >
            ≡
          </button>
        </Tooltip>
        <Tooltip content="Alinea el texto a la derecha.">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
          >
            ⇥≡
          </button>
        </Tooltip>
        <Tooltip content="Justifica el texto, distribuyéndolo de manera uniforme entre los márgenes.">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
          >
            ☰
          </button>
        </Tooltip>

        <span className="toolbar-divider" />

        {/* === LISTAS === */}
        <Tooltip content="Inserta una lista con viñetas.">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'is-active' : ''}
          >
            •
          </button>
        </Tooltip>
        <Tooltip content="Inserta una lista numerada.">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'is-active' : ''}
          >
            1.
          </button>
        </Tooltip>
        <Tooltip content="Inserta una lista de tareas con casillas de verificación. Útil para instructivos o listas de pendientes.">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={editor.isActive('taskList') ? 'is-active' : ''}
          >
            ☑
          </button>
        </Tooltip>

        <span className="toolbar-divider" />

        {/* === BLOQUES === */}
        <Tooltip content="Convierte el párrafo en una cita destacada, mostrándolo con sangría y un borde lateral.">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'is-active' : ''}
          >
            &ldquo;
          </button>
        </Tooltip>
        <Tooltip content="Inserta un bloque de código con resaltado de sintaxis. Soporta varios lenguajes de programación.">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={editor.isActive('codeBlock') ? 'is-active' : ''}
          >
            {'{ }'}
          </button>
        </Tooltip>
        <Tooltip content="Inserta una línea divisoria horizontal para separar secciones del artículo.">
          <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            —
          </button>
        </Tooltip>

        <span className="toolbar-divider" />

        {/* === SUBÍNDICE / SUPERÍNDICE === */}
        <Tooltip content="Convierte el texto en subíndice, mostrándolo más pequeño y por debajo de la línea base. Útil para fórmulas químicas o notas.">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={editor.isActive('subscript') ? 'is-active' : ''}
          >
            X<sub>2</sub>
          </button>
        </Tooltip>
        <Tooltip content="Convierte el texto en superíndice, mostrándolo más pequeño y por encima de la línea base. Útil para exponentes o notas al pie.">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={editor.isActive('superscript') ? 'is-active' : ''}
          >
            X<sup>2</sup>
          </button>
        </Tooltip>

        <span className="toolbar-divider" />

        {/* === DESHACER / REHACER === */}
        <Tooltip content="Deshace la última acción realizada en el editor." shortcut="Ctrl+Z">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            ↶
          </button>
        </Tooltip>
        <Tooltip content="Rehace la última acción deshecha." shortcut="Ctrl+Shift+Z">
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            ↷
          </button>
        </Tooltip>
      </div>

      <div className="toolbar-row">
        {/* === ENLACE === */}
        <Tooltip content="Convierte el texto seleccionado en un enlace, o agrega un enlace nuevo." shortcut="Ctrl+K">
          <button
            type="button"
            onClick={handleLink}
            className={editor.isActive('link') ? 'is-active' : ''}
          >
            🔗 Enlace
          </button>
        </Tooltip>

        <span className="toolbar-divider" />

        {/* === ANCHOR LINKS === */}
        <Tooltip content="Asigna un id (ancla) al encabezado seleccionado para poder enlazarlo desde otra parte del artículo. El enlace (#anchor) se copia al portapapeles.">
          <button type="button" onClick={anchorSelectedHeading}>
            📑 Anclar heading
          </button>
        </Tooltip>

        <span className="toolbar-divider" />

        <Tooltip content="Sube una imagen desde tu computadora. Se almacena en el almacenamiento del CMS. Peso máximo: 5 MB.">
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            🖼️ Subir imagen
          </button>
        </Tooltip>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        <Tooltip content="Inserta una imagen pegando la URL directa donde está alojada.">
          <button type="button" onClick={handleImageFromUrl}>
            🌐 Desde URL
          </button>
        </Tooltip>

        <span className="toolbar-divider" />

        {/* === EMBEDS DE REDES SOCIALES === */}
        <Tooltip content="Inserta un video de YouTube. Acepta enlaces completos, acortados (youtu.be) o de Shorts.">
          <button type="button" onClick={() => { setEmbedUrl(''); setShowEmbedInput('youtube') }}>
            📺 YouTube
          </button>
        </Tooltip>
        <Tooltip content="Inserta una publicación de X (antes Twitter). Pega la URL del tuit que quieres mostrar.">
          <button type="button" onClick={() => { setEmbedUrl(''); setShowEmbedInput('twitter') }}>
            🐦 X (Twitter)
          </button>
        </Tooltip>
        <Tooltip content="Inserta una publicación de Instagram. Pega la URL de la foto o reel que quieres mostrar.">
          <button type="button" onClick={() => { setEmbedUrl(''); setShowEmbedInput('instagram') }}>
            📷 Instagram
          </button>
        </Tooltip>

        {showEmbedInput && (
          <>
            <span className="toolbar-divider" />
            <input
              type="text"
              className="toolbar-input"
              placeholder={
                showEmbedInput === 'youtube'   ? 'Pega aquí la URL del video de YouTube' :
                showEmbedInput === 'twitter'   ? 'Pega aquí la URL del tuit o publicación de X' :
                                                 'Pega aquí la URL de la publicación de Instagram'
              }
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitEmbed()}
              autoFocus
            />
            <Tooltip content="Confirma la inserción del contenido.">
              <button type="button" onClick={submitEmbed} className="btn-primary btn-sm">
                Insertar
              </button>
            </Tooltip>
            <Tooltip content="Cancela la inserción y cierra este campo.">
              <button
                type="button"
                onClick={() => { setEmbedUrl(''); setShowEmbedInput(null) }}
                className="btn-secondary btn-sm"
              >
                Cancelar
              </button>
            </Tooltip>
          </>
        )}

        <span className="toolbar-divider" />

        {/* === DISTRIBUCIÓN EN COLUMNAS === */}
        <Tooltip content="Divide el contenido en dos columnas paralelas. Útil para comparar opciones lado a lado.">
          <button type="button" onClick={insertColumns2}>
            ▥▥ 2 columnas
          </button>
        </Tooltip>
        <Tooltip content="Divide el contenido en tres columnas paralelas.">
          <button type="button" onClick={insertColumns3}>
            ▥▥▥ 3 columnas
          </button>
        </Tooltip>

        <span className="toolbar-divider" />

        {/* === TABLAS === */}
        <Tooltip content="Inserta una tabla con 3 filas y 3 columnas, con fila de encabezado. Puedes redimensionar columnas arrastrando el borde.">
          <button
            type="button"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            ⊞ Insertar tabla
          </button>
        </Tooltip>

        <span className="toolbar-divider" />

        {/* === EXTRAS EDITORIALES === */}
        <Tooltip content="Convierte la primera letra del primer párrafo en una letra capital grande y decorativa, típica de las portadas de revistas.">
          <button type="button" onClick={insertDropCap}>
            🔠 Letra capital
          </button>
        </Tooltip>
        <Tooltip content="Inserta una cita destacada de gran tamaño, ideal para frases memorables o declaraciones clave.">
          <button type="button" onClick={insertPullQuote}>
            ❝ Cita destacada
          </button>
        </Tooltip>
        <Tooltip content="Inserta un recuadro de llamado de atención. Elige entre información, alerta, dato verificado o consejo.">
          <select
            className="toolbar-select"
            onChange={(e) => {
              const v = e.target.value
              if (v) { insertCallout(v); e.target.value = '' }
            }}
          >
            <option value="">Recuadro…</option>
            <option value="info">ℹ️ Información</option>
            <option value="warning">⚠️ Alerta</option>
            <option value="success">✅ Dato verificado</option>
            <option value="tip">💡 Consejo</option>
          </select>
        </Tooltip>
      </div>

      {showLinkDialog && (
        <InternalLinkDialog
          editor={editor}
          cms={cms}
          onClose={() => setShowLinkDialog(false)}
        />
      )}
    </div>
  )
}
