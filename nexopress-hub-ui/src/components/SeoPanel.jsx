import { useEffect, useState } from 'react'
import Tooltip from './Tooltip.jsx'

/**
 * Analiza la legibilidad de un texto en español usando la fórmula
 * Fernández-Huerta. Devuelve un puntaje de 0 a 100, un nivel cualitativo
 * y una lista de observaciones.
 */
const analyzeReadability = (html) => {
  if (!html) return { score: 0, level: 'unknown', issues: [] }
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!plain) return { score: 0, level: 'unknown', issues: [] }

  const sentences = plain.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 3)
  const words = plain.split(/\s+/).filter(Boolean)
  if (sentences.length === 0 || words.length === 0) {
    return { score: 0, level: 'unknown', issues: [] }
  }

  const countSyllables = (text) => {
    const wordMatches = text.toLowerCase().match(/[a-záéíóúñü]+/gi) || []
    let total = 0
    for (const w of wordMatches) {
      const groups = w.match(/[aeiouáéíóúü]+/gi)
      total += groups ? groups.length : 1
    }
    return total
  }

  const syllablesPer100Words = (countSyllables(plain) / words.length) * 100
  const sentencesPer100Words = (sentences.length / words.length) * 100
  const score = 206.84 - 0.60 * syllablesPer100Words - 1.02 * sentencesPer100Words
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)))

  const issues = []
  const longSentences = sentences.filter((s) => s.split(/\s+/).length > 25).length
  if (longSentences > 0) {
    issues.push({ type: 'long_sentences', count: longSentences, severity: 'warning' })
  }
  const paragraphs = plain.split(/\n\n+/)
  const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).length > 80).length
  if (longParagraphs > 0) {
    issues.push({ type: 'long_paragraphs', count: longParagraphs, severity: 'info' })
  }
  const subheadingCount = (html.match(/<h2/gi) || []).length
  if (words.length > 300 && subheadingCount === 0) {
    issues.push({ type: 'no_subheadings', severity: 'warning' })
  }

  return {
    score: clampedScore,
    level: clampedScore > 70 ? 'easy' : clampedScore > 50 ? 'medium' : 'hard',
    issues,
    metrics: {
      sentences: sentences.length,
      words: words.length,
      avgWordsPerSentence: Number((words.length / sentences.length).toFixed(1)),
      readingTimeMin: Math.max(1, Math.ceil(words.length / 200)),
    },
  }
}

/**
 * Analiza el uso de la palabra clave objetivo en el artículo.
 * Devuelve un puntaje de 0 a 100 y una lista de verificaciones.
 */
const analyzeFocusKeyword = (article, keyword) => {
  if (!keyword) return { score: 0, checks: [] }
  const kw = keyword.toLowerCase()
  const title = (article.title || '').toLowerCase()
  const body = (article.content || '').replace(/<[^>]+>/g, ' ').toLowerCase()
  const slug = (article.slug || '').toLowerCase()
  const metaDesc = (article.metaDescription || '').toLowerCase()

  const wordCount = body.split(/\s+/).filter(Boolean).length
  const kwCount = (body.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
  const density = wordCount > 0 ? (kwCount / wordCount) * 100 : 0

  const checks = [
    {
      name: 'La palabra clave aparece en el título',
      hint: 'Google otorga más peso a las coincidencias en el título. Procura que la palabra clave aparezca de forma natural.',
      pass: title.includes(kw), weight: 15,
    },
    {
      name: 'El título comienza con la palabra clave',
      hint: 'Los títulos que arrancan con la keyword tienen mejor desempeño en los resultados de búsqueda.',
      pass: title.startsWith(kw), weight: 10,
    },
    {
      name: 'Aparece en el primer párrafo',
      hint: 'Mencionar la keyword al inicio refuerza la relevancia temática del artículo.',
      pass: body.indexOf(kw) >= 0 && body.indexOf(kw) < 300, weight: 10,
    },
    {
      name: 'La densidad está entre 0.5 % y 2.5 %',
      hint: 'Una densidad muy baja pasa desapercibida; muy alta se considera spam. El rango ideal es de medio a dos y medio por ciento.',
      pass: density >= 0.5 && density <= 2.5, weight: 10, current: `${density.toFixed(2)} %`,
    },
    {
      name: 'Aparece en el slug (URL)',
      hint: 'Una URL limpia con la palabra clave mejora el posicionamiento y la tasa de clics.',
      pass: slug.includes(kw.replace(/\s+/g, '-')), weight: 8,
    },
    {
      name: 'Aparece en la meta description',
      hint: 'La meta description se muestra en Google; incluir la keyword la resalta en negritas.',
      pass: metaDesc.includes(kw), weight: 8,
    },
    {
      name: 'El título mide entre 40 y 60 caracteres',
      hint: 'Más de 60 caracteres se corta en los resultados de Google; menos de 40 desaprovecha espacio.',
      pass: (article.title?.length || 0) >= 40 && (article.title?.length || 0) <= 60, weight: 5,
      current: `${article.title?.length || 0} caracteres`,
    },
    {
      name: 'La meta description mide entre 120 y 156 caracteres',
      hint: 'Google muestra entre 120 y 156 caracteres. Menos se desaprovecha, más se corta.',
      pass: (article.metaDescription?.length || 0) >= 120 && (article.metaDescription?.length || 0) <= 156, weight: 5,
      current: `${article.metaDescription?.length || 0} caracteres`,
    },
  ]

  const score = checks.reduce((acc, c) => acc + (c.pass ? c.weight : 0), 0)
  return { score, checks, density: Number(density.toFixed(2)) }
}

export default function SeoPanel({ article, seoData, onUpdate }) {
  const [readability, setReadability] = useState(null)
  const [focusAnalysis, setFocusAnalysis] = useState(null)
  const [localKeyword, setLocalKeyword] = useState(article.focusKeyword || '')

  useEffect(() => {
    if (article.content) {
      setReadability(analyzeReadability(article.content))
    }
  }, [article.content])

  useEffect(() => {
    if (localKeyword && article) {
      setFocusAnalysis(analyzeFocusKeyword(article, localKeyword))
    } else {
      setFocusAnalysis(null)
    }
  }, [localKeyword, article])

  const getScoreColor = (score) => {
    if (score >= 70) return 'good'
    if (score >= 50) return 'medium'
    return 'bad'
  }

  const totalSeoScore = (readability?.score || 0) * 0.5 + (focusAnalysis?.score || 0) * 0.5

  return (
    <div className="seo-panel">
      <h3 className="card-title" style={{ marginBottom: '16px' }}>Posicionamiento en buscadores (SEO)</h3>

      {/* Puntaje general */}
      <div className="seo-score">
        <div className={`seo-score-circle ${getScoreColor(totalSeoScore)}`}>
          {Math.round(totalSeoScore)}
        </div>
        <div>
          <div style={{ fontWeight: '600' }}>Puntaje general</div>
          <div className="text-sm text-muted">
            {totalSeoScore >= 70 ? 'Excelente trabajo' : totalSeoScore >= 50 ? 'Se puede mejorar' : 'Necesita más trabajo'}
          </div>
        </div>
      </div>

      {/* Campo de palabra clave objetivo */}
      <div style={{ marginBottom: '16px' }}>
        <Tooltip content="Es la frase por la que querés que tu artículo aparezca en Google. Normalmente tiene 2 o 3 palabras, por ejemplo: 'reforma judicial 2026' o 'clima cdmx hoy'.">
          <label className="form-label">Palabra clave objetivo</label>
        </Tooltip>
        <input
          type="text"
          value={localKeyword}
          onChange={(e) => {
            setLocalKeyword(e.target.value)
            onUpdate({ focusKeyword: e.target.value })
          }}
          placeholder="Por ejemplo: reforma judicial 2026"
        />
      </div>

      {/* Legibilidad */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
          Legibilidad
        </h4>
        {readability ? (
          <>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <span className="text-sm">
                Puntaje: <strong>{readability.score}/100</strong>
              </span>
              <span className={`badge badge-${readability.level === 'easy' ? 'success' : readability.level === 'medium' ? 'warning' : 'error'}`}>
                {readability.level === 'easy' ? 'Fácil de leer' : readability.level === 'medium' ? 'Nivel medio' : 'Difícil de leer'}
              </span>
            </div>
            <div className="text-xs text-muted" style={{ marginBottom: '8px' }}>
              {readability.metrics?.words} palabras · {readability.metrics?.sentences} oraciones ·{' '}
              {readability.metrics?.readingTimeMin} {readability.metrics?.readingTimeMin === 1 ? 'minuto' : 'minutos'} de lectura
            </div>
            {readability.issues.length > 0 && (
              <ul style={{ fontSize: '12px', paddingLeft: '16px' }}>
                {readability.issues.map((issue, i) => (
                  <li key={i} className={issue.severity === 'warning' ? 'text-warning' : 'text-muted'}>
                    {issue.type === 'long_sentences' &&
                      `Hay ${issue.count} ${issue.count === 1 ? 'oración muy larga' : 'oraciones muy largas'} (más de 25 palabras). Considera dividirlas.`}
                    {issue.type === 'long_paragraphs' &&
                      `Hay ${issue.count} ${issue.count === 1 ? 'párrafo muy extenso' : 'párrafos muy extensos'} (más de 80 palabras). Conviene fragmentarlos.`}
                    {issue.type === 'no_subheadings' &&
                      'El artículo no tiene subtítulos (H2). Agregalos para separar las secciones y mejorar la lectura.'}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">
            Empieza a escribir para ver el análisis de legibilidad…
          </p>
        )}
      </div>

      {/* Análisis de la palabra clave */}
      {focusAnalysis && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Análisis de la palabra clave: &ldquo;{localKeyword}&rdquo;
          </h4>
          <div className="flex-between" style={{ marginBottom: '8px' }}>
            <span className="text-sm">
              Puntaje: <strong>{focusAnalysis.score}/100</strong>
            </span>
            <span className="text-xs text-muted">
              Densidad: {focusAnalysis.density} %
            </span>
          </div>
          <ul className="seo-checklist">
            {focusAnalysis.checks.map((check, i) => (
              <li key={i} className="seo-check-item">
                <span className={`check ${check.pass ? 'pass' : 'fail'}`}>
                  {check.pass ? '✓' : '×'}
                </span>
                <span className="text-sm" style={{ flex: 1 }}>
                  {check.name}
                  {check.current && (
                    <span className="text-xs text-muted"> ({check.current})</span>
                  )}
                </span>
                <Tooltip content={check.hint} width={260}>
                  <span className="info-icon">ⓘ</span>
                </Tooltip>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meta Title */}
      <div style={{ marginBottom: '16px' }}>
        <Tooltip content="Es el título que Google muestra en los resultados de búsqueda. Si lo dejás vacío, se usa el título del artículo. Lo ideal es que mida entre 40 y 60 caracteres.">
          <label className="form-label">Meta título (cómo se ve en Google)</label>
        </Tooltip>
        <input
          type="text"
          value={article.metaTitle || ''}
          onChange={(e) => onUpdate({ metaTitle: e.target.value })}
          placeholder={article.title || 'Título del artículo'}
          maxLength={60}
        />
        <div
          className={`text-xs ${
            (article.metaTitle?.length || 0) >= 40 && (article.metaTitle?.length || 0) <= 60
              ? 'text-success'
              : 'text-muted'
          }`}
          style={{ marginTop: '4px' }}
        >
          {article.metaTitle?.length || 0} / 60 caracteres
        </div>
      </div>

      {/* Meta Description */}
      <div style={{ marginBottom: '16px' }}>
        <Tooltip content="Es el texto que Google muestra debajo del título en los resultados. Debe ser atractivo y contener la palabra clave. Lo ideal es que mida entre 120 y 156 caracteres.">
          <label className="form-label">Meta descripción (resumen para Google)</label>
        </Tooltip>
        <textarea
          value={article.metaDescription || ''}
          onChange={(e) => onUpdate({ metaDescription: e.target.value })}
          placeholder="Escribe un resumen atractivo de 1 o 2 oraciones que invite a hacer clic…"
          rows={3}
          maxLength={156}
        />
        <div
          className={`text-xs ${
            (article.metaDescription?.length || 0) >= 120 && (article.metaDescription?.length || 0) <= 156
              ? 'text-success'
              : 'text-muted'
          }`}
          style={{ marginTop: '4px' }}
        >
          {article.metaDescription?.length || 0} / 156 caracteres
        </div>
      </div>
    </div>
  )
}
