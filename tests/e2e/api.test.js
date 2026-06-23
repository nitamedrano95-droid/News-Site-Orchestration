/**
 * Pruebas E2E — Workers API (producción)
 * Ejecutar: node --test tests/e2e/api.test.js
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { WORKERS, TIMEOUT_MS } from '../helpers/config.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { res, body: await res.json().catch(() => null) };
}

// ─── cms-originaux ─────────────────────────────────────────────────────────────

describe('cms-originaux', () => {
  const BASE = WORKERS.originaux;
  let firstSlug = null;

  test('GET /api/health → 200', async () => {
    const { res } = await get(`${BASE}/api/health`);
    assert.equal(res.status, 200);
  });

  test('GET /api/articles → lista con al menos 1 artículo', async () => {
    const { res, body } = await get(`${BASE}/api/articles?limit=5`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body?.articles), 'body.articles debe ser array');
    assert.ok(body.articles.length > 0, 'debe haber al menos 1 artículo');
    firstSlug = body.articles[0]?.slug;
  });

  test('GET /api/articles/:slug → devuelve article con campos públicos', async () => {
    if (!firstSlug) return; // salta si el test anterior falló
    const { res, body } = await get(`${BASE}/api/articles/${encodeURIComponent(firstSlug)}`);
    assert.equal(res.status, 200);
    const a = body?.article;
    assert.ok(a, 'body.article debe existir');
    // Campos públicos (el renderizado de la página pública los necesita)
    assert.ok('title'     in a, 'article debe tener title');
    assert.ok('content'   in a || 'excerpt' in a, 'article debe tener content o excerpt');
    assert.ok('imageUrl'  in a, 'article debe tener imageUrl');
    assert.ok('slug'      in a, 'article debe tener slug');
    // Nota: metaTitle/metaDescription/focusKeyword están solo en GET /articles/id/:id
    // (endpoint de editor, requiere sesión de Hub)
  });

  test('GET /api/articles/:slug → responde CORS para origen permitido', async () => {
    if (!firstSlug) return;
    const { res } = await fetch(
      `${BASE}/api/articles/${encodeURIComponent(firstSlug)}`,
      {
        headers: { Origin: 'https://www.cbnnoticias.click' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    ).then(r => ({ res: r }));
    const acao = res.headers.get('access-control-allow-origin');
    assert.equal(acao, 'https://www.cbnnoticias.click', 'CORS debe devolver el origin permitido');
  });

  test('GET /api/cms/articles?search=noticias → búsqueda de links internos', async () => {
    const { res, body } = await get(`${BASE}/api/cms/articles?search=noticias&limit=5`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body?.articles), 'debe devolver array de artículos');
  });
});

// ─── Smoke de los otros 4 Workers ─────────────────────────────────────────────

for (const [name, base] of Object.entries(WORKERS)) {
  if (name === 'originaux') continue; // ya tiene tests detallados arriba

  describe(`${name} — smoke test`, () => {
    test('GET /api/health → 200', async () => {
      const { res } = await get(`${base}/api/health`);
      assert.equal(res.status, 200, `${name} Worker debe estar en línea`);
    });

    test('GET /api/articles → responde con artículos', async () => {
      const { res, body } = await get(`${base}/api/articles?limit=1`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(body?.articles));
    });
  });
}
