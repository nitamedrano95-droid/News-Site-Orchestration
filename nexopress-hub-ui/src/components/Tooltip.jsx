import { useRef, useState, useEffect } from 'react'

/**
 * Tooltip informativo — popup con descripción + atajo de teclado.
 * Se muestra al pasar el mouse o al recibir foco (navegación por teclado).
 * Posiciona arriba por defecto; si no hay espacio, baja.
 *
 * Props:
 *   content: string  — descripción de la herramienta
 *   shortcut: string — atajo de teclado opcional (formato legible: "Ctrl+B")
 *   side: 'top' | 'bottom' — posición preferida (auto-flip si no entra)
 *   children: ReactNode — el elemento que envuelve
 */
export default function Tooltip({ content, shortcut, side = 'top', children, width = 240 }) {
  const [visible, setVisible] = useState(false)
  const [resolvedSide, setResolvedSide] = useState(side)
  const wrapperRef = useRef(null)
  const showTimer = useRef(null)

  const show = () => {
    showTimer.current = setTimeout(() => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        // Si está demasiado arriba, flip abajo
        const newSide = rect.top < 110 ? 'bottom' : side
        setResolvedSide(newSide)
        setVisible(true)
      }
    }, 400)
  }

  const hide = () => {
    if (showTimer.current) clearTimeout(showTimer.current)
    showTimer.current = null
    setVisible(false)
  }

  useEffect(() => () => {
    if (showTimer.current) clearTimeout(showTimer.current)
  }, [])

  return (
    <span
      ref={wrapperRef}
      className="tooltip-wrapper"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
    >
      {children}
      <span
        className={`tooltip-content tooltip-${resolvedSide} ${visible ? 'is-visible' : ''}`}
        role="tooltip"
        style={{ width: `${width}px` }}
      >
        <span className="tooltip-text">{content}</span>
        {shortcut && <kbd className="tooltip-kbd">{shortcut}</kbd>}
        <span className="tooltip-arrow" />
      </span>
    </span>
  )
}
