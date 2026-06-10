// src/utils/seo.js — SEO utilities for the Yoast-like panel.
// Runs on the Worker (readability) and the frontend (preview).
// All functions are pure and deterministic.

const TRANSITIONS_ES = [
  'además', 'asimismo', 'sin embargo', 'por lo tanto', 'en consecuencia',
  'por otra parte', 'finalmente', 'entonces', 'aunque', 'mientras',
  'debido a', 'a pesar de', 'en cambio', 'por eso', 'así',
];

const countSyllablesES = (text) => {
  const words = text.toLowerCase().match(/[a-záéíóúñü]+/gi) || [];
  let total = 0;
  for (const w of words) {
    const groups = w.match(/[aeiouáéíóúü]+/gi);
    total += groups ? groups.length : 1;
  }
  return total;
};

// ── Readability (Fernandez-Huerta, 1959) ──
// Adapted Flesch formula for Spanish. Score 0-100 (higher = easier).
export const analyzeReadability = (html) => {
  if (typeof html !== 'string') return { score: 0, level: 'unknown', issues: [] };
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!plain) return { score: 0, level: 'unknown', issues: [] };

  const sentences = plain.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 3);
  const words = plain.split(/\s+/).filter(Boolean);

  if (sentences.length === 0 || words.length === 0) {
    return { score: 0, level: 'unknown', issues: [] };
  }

  const syllablesPer100Words = (countSyllablesES(plain) / words.length) * 100;
  const sentencesPer100Words = (sentences.length / words.length) * 100;
  const score = 206.84 - 0.60 * syllablesPer100Words - 1.02 * sentencesPer100Words;
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  const issues = [];

  // Long sentences (>25 words)
  const longSentences = sentences.filter((s) => s.split(/\s+/).length > 25).length;
  if (longSentences > 0) {
    issues.push({ type: 'long_sentences', count: longSentences, severity: 'warning' });
  }

  // Long paragraphs (>80 words)
  const paragraphs = plain.split(/\n\n+/);
  const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).length > 80).length;
  if (longParagraphs > 0) {
    issues.push({ type: 'long_paragraphs', count: longParagraphs, severity: 'info' });
  }

  // Transition words (signal of good cohesion)
  const lower = plain.toLowerCase();
  const transitionCount = TRANSITIONS_ES.filter((t) => lower.includes(t)).length;
  if (transitionCount < 2 && words.length > 200) {
    issues.push({ type: 'few_transitions', count: transitionCount, severity: 'info' });
  }

  // Subheading distribution
  const subheadingCount = (html.match(/<h2/gi) || []).length;
  if (words.length > 300 && subheadingCount === 0) {
    issues.push({ type: 'no_subheadings', severity: 'warning' });
  }

  return {
    score: clampedScore,
    level: clampedScore > 70 ? 'easy' : clampedScore > 50 ? 'medium' : 'hard',
    issues,
    metrics: {
      sentences: sentences.length,
      words: words.length,
      syllables: countSyllablesES(plain),
      avgWordsPerSentence: Number((words.length / sentences.length).toFixed(1)),
      readingTimeMin: Math.max(1, Math.ceil(words.length / 200)),
    },
  };
};

// ── Focus keyword analysis ──
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const analyzeFocusKeyword = (article, keyword) => {
  if (!keyword) return { score: 0, checks: [] };
  const kw = keyword.toLowerCase();
  const title = (article.title || '').toLowerCase();
  const body = (article.content || '').replace(/<[^>]+>/g, ' ').toLowerCase();
  const slug = (article.slug || '').toLowerCase();
  const metaDesc = (article.metaDescription || article.excerpt || '').toLowerCase();
  const altTexts = (article.imageAlt || []).map((a) => (a || '').toLowerCase());
  const subheadings = ((article.content || '').match(/<h2[^>]*>([^<]+)<\/h2>/gi) || [])
    .map((h) => h.replace(/<[^>]+>/g, '').toLowerCase());

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const kwRegex = new RegExp(escapeRegex(kw), 'g');
  const kwCount = (body.match(kwRegex) || []).length;
  const density = wordCount > 0 ? (kwCount / wordCount) * 100 : 0;

  const checks = [
    { name: 'Aparece en el título',                pass: title.includes(kw),                                            weight: 15 },
    { name: 'Título comienza con la keyword',      pass: title.startsWith(kw),                                          weight: 10 },
    { name: 'Aparece en el primer párrafo',        pass: body.indexOf(kw) >= 0 && body.indexOf(kw) < 300,             weight: 10 },
    { name: 'Aparece en al menos un H2',           pass: subheadings.some((s) => s.includes(kw)),                       weight: 8 },
    { name: 'Densidad entre 0.5% y 2.5%',          pass: density >= 0.5 && density <= 2.5,                              weight: 10, current: `${density.toFixed(2)}%` },
    { name: 'Aparece en el slug',                  pass: slug.includes(kw.replace(/\s+/g, '-')),                      weight: 8 },
    { name: 'Aparece en la meta description',      pass: metaDesc.includes(kw),                                        weight: 8 },
    { name: 'Aparece en al menos un alt',          pass: altTexts.some((a) => a.includes(kw)),                         weight: 6 },
    { name: 'Longitud del título (40-60 chars)',   pass: (article.title?.length || 0) >= 40 && (article.title?.length || 0) <= 60, weight: 5, current: `${article.title?.length || 0} chars` },
    { name: 'Meta description (120-156 chars)',    pass: (article.metaDescription?.length || 0) >= 120 && (article.metaDescription?.length || 0) <= 156, weight: 5, current: `${article.metaDescription?.length || 0} chars` },
  ];

  const score = checks.reduce((acc, c) => acc + (c.pass ? c.weight : 0), 0);
  return { score, checks, density: Number(density.toFixed(2)), keyword: kw };
};

// ── NewsArticle JSON-LD schema generator ──
export const generateNewsArticleSchema = (article) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': (article.metaTitle || article.title || '').slice(0, 110),
    'image': article.imageUrl ? [article.imageUrl] : [],
    'datePublished': article.publishedAt
      ? new Date(article.publishedAt).toISOString()
      : new Date().toISOString(),
    'dateModified': new Date().toISOString(),
    'author': { '@type': 'Person', 'name': article.author || 'Redacción' },
    'publisher': {
      '@type': 'Organization',
      'name': article.siteName || 'NexoPress',
      'logo': { '@type': 'ImageObject', 'url': article.siteLogo || '' },
    },
    'description': article.metaDescription || article.excerpt || '',
    'articleSection': article.category || 'Nacional',
    'keywords': Array.isArray(article.tags) ? article.tags.join(', ') : '',
    'inLanguage': 'es-MX',
    'isAccessibleForFree': true,
  };
};
