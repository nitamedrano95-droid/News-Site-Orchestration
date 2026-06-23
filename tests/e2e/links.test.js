/**
 * Pruebas E2E — Búsqueda de links internos en el editor
 *
 * Verifica que GET /api/cms/articles?search=... devuelva resultados
 * (el fix anterior corregía que la URL usaba /cms/{cms}/articles en vez de /cms/articles)
 *
 * Ejecutar: node --test tests/e2e/links.test.js
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { WORKERS, TIMEOUT_MS } from '../helpers/config.js';

async function searchLinks(worker, query) {
  const url = `${worker}/api/cms/articles?search=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

for (const [name, base] of Object.entries(WORKERS)) {
  describe(`Links internos — ${name}`, () => {
    test('GET /api/cms/articles?search=... → 200 con array', async () => {
      const { status, body } = await searchLinks(base, 'noticias');
      assert.equal(status, 200, `${name}: debe responder 200`);
      assert.ok(Array.isArray(body?.articles),
        `${name}: body.articles debe ser array (verificar que el endpoint existe)`);
    });

    test('Búsqueda vacía no rompe el servidor', async () => {
      const { status } = await searchLinks(base, '');
      assert.ok(status < 500, `${name}: búsqueda vacía no debe causar 500`);
    });

    test('Resultados tienen slug y title', async () => {
      const { body } = await searchLinks(base, 'mexico');
      if (!body?.articles?.length) return; // sin resultados, ok
      const a = body.articles[0];
      assert.ok(a.slug,  'artículo debe tener slug');
      assert.ok(a.title, 'artículo debe tener title');
    });
  });
}
