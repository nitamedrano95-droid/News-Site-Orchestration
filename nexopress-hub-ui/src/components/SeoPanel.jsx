import { useEffect, useState } from 'react'

// Fernandez-Huerta readability formula (Spanish)
const analyzeReadability = (html) => {
  if (!html) return { score: 0, level: 'unknown', issues: [] }
  
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!plain) return { score: 0, level: 'unknown', issues: [] }

  const sentences = plain.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 3)
  const words = plain.split(/\s+/).filter(Boolean)
  
  if (sentences.length === 0 || words.length === 0) {
    return { score: 0, level: 'unknown', issues: [] }
  }

  // Count syllables (Spanish)
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
  
  const longSentences = sentences.filter(s => s.split(/\s+/).length > 25).length
  if (longSentences > 0) {
    issues.push({ type: 'long_sentences', count: longSentences, severity: 'warning' })
  }

  const paragraphs = plain.split(/\n\n+/)
  const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 80).length
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

// Focus keyword analysis
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
    { name: 'Aparece en el título', pass: title.includes(kw), weight: 15 },
    { name: 'Título comienza con la keyword', pass: title.startsWith(kw), weight: 10 },
    { name: 'Aparece en el primer párrafo', pass: body.indexOf(kw) >= 0 && body.indexOf(kw) < 300, weight: 10 },
    { name: 'Densidad entre 0.5% y 2.5%', pass: density >= 0.5 && density <= 2.5, weight: 10, current: `${density.toFixed(2)}%` },
    { name: 'Aparece en el slug', pass: slug.includes(kw.replace(/\s+/g, '-')), weight: 8 },
    { name: 'Aparece en la meta description', pass: metaDesc.includes(kw), weight: 8 },
    { name: 'Longitud del título (40-60 chars)', pass: (article.title?.length || 0) >= 40 && (article.title?.length || 0) <= 60, weight: 5, current: `${article.title?.length || 0} chars` },
    { name: 'Meta description (120-156 chars)', pass: (article.metaDescription?.length || 0) >= 120 && (article.metaDescription?.length || 0) <= 156, weight: 5, current: `${article.metaDescription?.length || 0} chars` },
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
      const r = analyzeReadability(article.content)
      setReadability(r)
    }
  }, [article.content])

  useEffect(() => {
    if (localKeyword && article) {
      const f = analyzeFocusKeyword(article, localKeyword)
      setFocusAnalysis(f)
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
      <h3 className="card-title" style={{ marginBottom: '16px' }}>SEO</h3>

      {/* Overall Score */}
      <div className="seo-score">
        <div className={`seo-score-circle ${getScoreColor(totalSeoScore)}`}>
          {Math.round(totalSeoScore)}
        </div>
        <div>
          <div style={{ fontWeight: '600' }}>Puntuación SEO</div>
          <div className="text-sm text-muted">
            {totalSeoScore >= 70 ? 'Excelente' : totalSeoScore >= 50 ? 'Mejorable' : 'Necesita trabajo'}
          </div>
        </div>
      </div>

      {/* Focus Keyword Input */}
      <div style={{ marginBottom: '16px' }}>
        <label className="form-label">Keyword objetivo</label>
        <input
          type="text"
          value={localKeyword}
          onChange={(e) => {
            setLocalKeyword(e.target.value)
            onUpdate({ focusKeyword: e.target.value })
          }}
          placeholder="ej. reforma energética"
        />
      </div>

      {/* Readability */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Legibilidad</h4>
        {readability ? (
          <>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <span className="text-sm">Score: <strong>{readability.score}/100</strong></span>
              <span className={`badge badge-${readability.level === 'easy' ? 'success' : readability.level === 'medium' ? 'warning' : 'error'}`}>
                {readability.level === 'easy' ? 'Fácil' : readability.level === 'medium' ? 'Medio' : 'Difícil'}
              </span>
            </div>
            <div className="text-xs text-muted" style={{ marginBottom: '8px' }}>
              {readability.metrics?.words} palabras · {readability.metrics?.sentences} oraciones · {readability.metrics?.readingTimeMin} min de lectura
            </div>
            {readability.issues.length > 0 && (
              <ul style={{ fontSize: '12px', paddingLeft: '16px' }}>
                {readability.issues.map((issue, i) => (
                  <li key={i} className={issue.severity === 'warning' ? 'text-warning' : 'text-muted'}>
                    {issue.type === 'long_sentences' && `${issue.count} oraciones muy largas (>25 palabras)`}
                    {issue.type === 'long_paragraphs' && `${issue.count} párrafos muy largos (>80 palabras)`}
                    {issue.type === 'no_subheadings' && 'Faltan subtítulos (H2) para separar secciones'}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">Escribí contenido para analizar legibilidad...</p>
        )}
      </div>

      {/* Focus Keyword Analysis */}
      {focusAnalysis && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Análisis de keyword: "{localKeyword}"
          </h4>
          <div className="flex-between" style={{ marginBottom: '8px' }}>
            <span className="text-sm">Score: <strong>{focusAnalysis.score}/100</strong></span>
            <span className="text-xs text-muted">Densidad: {focusAnalysis.density}%</span>
          </div>
          <ul className="seo-checklist">
            {focusAnalysis.checks.map((check, i) => (
              <li key={i}>
                <span className={`check ${check.pass ? 'pass' : 'fail'}`}>
                  {check.pass ? '✓' : '×'}
                </span>
                <span className="text-sm" style={{ flex: 1 }}>
                  {check.name}
                  {check.current && <span className="text-xs text-muted"> ({check.current})</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meta Fields */}
      <div style={{ marginBottom: '16px' }}>
        <label className="form-label">Meta Title</label>
        <input
          type="text"
          value={article.metaTitle || ''}
          onChange={(e) => onUpdate({ metaTitle: e.target.value })}
          placeholder={article.title || 'Título del artículo'}
          maxLength={60}
        />
        <div className={`text-xs ${((article.metaTitle?.length || 0) >= 40 && (article.metaTitle?.length || 0) <= 60) ? 'text-success' : 'text-muted'}`} style={{ marginTop: '4px' }}>
          {article.metaTitle?.length || 0}/60 caracteres
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label className="form-label">Meta Description</label>
        <textarea
          value={article.metaDescription || ''}
          onChange={(e) => onUpdate({ metaDescription: e.target.value })}
          placeholder="Descripción para motores de búsqueda..."
          rows={3}
          maxLength={156}
        />
        <div className={`text-xs ${((article.metaDescription?.length || 0) >= 120 && (article.metaDescription?.length || 0) <= 156) ? 'text-success' : 'text-muted'}`} style={{ marginTop: '4px' }}>
          {article.metaDescription?.length || 0}/156 caracteres
        </div>
      </div>

      {/* SERP Preview */}
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Vista previa en Google</h4>
        <div className="serp-preview">
          <div className="serp-preview-title">
            {(article.metaTitle || article.title || 'Título del artículo').slice(0, 60)}
          </div>
          <div className="serp-preview-url">
            https://tusitio.com/noticia/{(article.slug || 'slug').slice(0, 50)}
          </div>
          <div className="serp-preview-desc">
            {(article.metaDescription || article.title || 'Descripción del artículo...').slice(0, 156)}
          </div>
        </div>
      </div>
    </div>
  )
}
