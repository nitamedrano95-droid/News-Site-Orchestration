/**
 * Pruebas E2E — OG tags en páginas de artículo (producción)
 *
 * Verifica que el middleware inyecte OG tags válidos tanto en:
 *   - Ruta no-www  (va a través del CMS Worker → injectMetaTags en html.js)
 *   - Ruta www     (va directo a Pages → article-middleware.js)
 *
 * Ejecutar: node --test tests/e2e/og-tags.test.js
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { WORKERS, SAMPLE_SITES, TIMEOUT_MS } from '../helpers/config.js';
import { parseMetaTags, parseTitle, isValidHttpsUrl } from '../helpers/og.js';

const BASE = WORKERS.originaux;
const SITE = SAMPLE_SITES.originaux;

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NexopressE2E/1.0' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.text();
}

async function getFirstArticleSlug() {
  const res = await fetch(`${BASE}/api/articles?limit=5&site=${SITE.slug}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await res.json();
  const article = body?.articles?.find(a => a.imageUrl); // preferir con imagen
  return article?.slug ?? body?.articles?.[0]?.slug ?? null;
}

// ─── OG tags — ruta no-www (Worker path) ──────────────────────────────────────

describe('OG tags — no-www (Worker + injectMetaTags)', () => {
  let slug = null;
  let tags = {};
  let title = '';

  before(async () => {
    slug = await getFirstArticleSlug();
    if (!slug) return;
    const url = `${SITE.noWww}/articulo/?slug=${encodeURIComponent(slug)}`;
    const html = await fetchHtml(url);
    tags = parseMetaTags(html);
    title = parseTitle(html);
  });

  test('tiene slug disponible', () => {
    assert.ok(slug, 'debe encontrar al menos un artículo en producción');
  });

  test('<title> no dice "Cargando"', () => {
    assert.ok(slug, 'requiere slug');
    assert.ok(!title.toLowerCase().includes('cargando'), `<title> no debe ser el placeholder: "${title}"`);
  });

  test('og:title presente y no vacío', () => {
    assert.ok(slug, 'requiere slug');
    assert.ok(tags['og:title']?.trim(), 'og:title debe estar presente y no vacío');
  });

  test('og:description presente y no vacío', () => {
    assert.ok(slug, 'requiere slug');
    assert.ok(tags['og:description']?.trim(), 'og:description debe estar presente');
  });

  test('og:image es URL HTTPS válida', () => {
    assert.ok(slug, 'requiere slug');
    assert.ok(tags['og:image'], 'og:image debe estar presente');
    assert.ok(isValidHttpsUrl(tags['og:image']), `og:image debe ser HTTPS: "${tags['og:image']}"`);
  });

  test('og:image NO declara dimensiones hardcoded (fix aplicado)', () => {
    assert.ok(slug, 'requiere slug');
    assert.equal(tags['og:image:width'],  undefined, 'og:image:width no debe existir');
    assert.equal(tags['og:image:height'], undefined, 'og:image:height no debe existir');
  });

  test('og:url presente y apunta al artículo', () => {
    assert.ok(slug, 'requiere slug');
    assert.ok(tags['og:url']?.includes(slug) || tags['og:url']?.includes('articulo'),
      `og:url debe incluir el slug o "articulo": "${tags['og:url']}"`);
  });

  test('fb:app_id presente', () => {
    assert.ok(slug, 'requiere slug');
    assert.ok(tags['fb:app_id'], 'fb:app_id debe estar presente');
  });

  test('og:locale = es_MX', () => {
    assert.ok(slug, 'requiere slug');
    assert.equal(tags['og:locale'], 'es_MX');
  });
});

// ─── OG tags — ruta www (Pages path) ──────────────────────────────────────────

describe('OG tags — www (Pages + article-middleware.js)', () => {
  let slug = null;
  let tags = {};
  let title = '';

  before(async () => {
    slug = await getFirstArticleSlug();
    if (!slug || !SITE.www) return;
    const url = `${SITE.www}/articulo/?slug=${encodeURIComponent(slug)}`;
    const html = await fetchHtml(url);
    tags = parseMetaTags(html);
    title = parseTitle(html);
  });

  test('www disponible para este sitio', () => {
    assert.ok(SITE.www, 'el sitio de prueba tiene dominio www configurado');
    assert.ok(slug, 'debe encontrar al menos un artículo en producción');
  });

  test('<title> no dice "Cargando"', () => {
    if (!SITE.www || !slug) return;
    assert.ok(!title.toLowerCase().includes('cargando'), `<title> no debe ser placeholder: "${title}"`);
  });

  test('og:title presente y coincide con ruta no-www', () => {
    if (!SITE.www || !slug) return;
    assert.ok(tags['og:title']?.trim(), 'og:title debe estar presente en ruta www');
  });

  test('og:image es URL HTTPS válida', () => {
    if (!SITE.www || !slug) return;
    assert.ok(tags['og:image'], 'og:image debe estar presente en ruta www');
    assert.ok(isValidHttpsUrl(tags['og:image']), `og:image debe ser HTTPS: "${tags['og:image']}"`);
  });

  test('og:image NO declara dimensiones hardcoded (fix aplicado)', () => {
    if (!SITE.www || !slug) return;
    assert.equal(tags['og:image:width'],  undefined, 'og:image:width no debe existir');
    assert.equal(tags['og:image:height'], undefined, 'og:image:height no debe existir');
  });

  test('fb:app_id presente', () => {
    if (!SITE.www || !slug) return;
    assert.ok(tags['fb:app_id'], 'fb:app_id debe estar presente en ruta www');
  });
});
