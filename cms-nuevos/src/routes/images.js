// src/routes/images.js — Servir imágenes desde R2 y subida de archivos

import { Hono } from 'hono';
import { checkAuth } from '../middleware/auth.js';

const images = new Hono();

// ── POST /api/images/upload — Subida multipart a R2 ─────────
// Body: multipart/form-data con campo "file" (image/*, máx 5 MB).
// Auth: Authorization: Bearer *** (vía checkAuth).
// Respuesta: { url: "https://uploads.sebastianvernis.space/<key>", key, contentType, size }
images.post('/upload', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  const contentType = c.req.header('content-type') || '';
  if (!contentType.startsWith('multipart/form-data')) {
    return c.json({ error: 'Expected multipart/form-data' }, 400);
  }

  let form;
  try {
    form = await c.req.formData();
  } catch (e) {
    return c.json({ error: 'Malformed multipart body: ' + e.message }, 400);
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return c.json({ error: 'Field "file" missing or not a file' }, 400);
  }
  if (file.size > 20 * 1024 * 1024) {
    return c.json({ error: 'File exceeds 20 MB limit' }, 413);
  }
  const mime = file.type || 'application/octet-stream';
  if (!mime.startsWith('image/')) {
    return c.json({ error: 'Only image/* allowed' }, 415);
  }

  const ext = (file.name || 'img').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const key = `images/${crypto.randomUUID()}.${ext}`;
  const buf = await file.arrayBuffer();

  try {
    await c.env.UPLOADS.put(key, buf, {
      httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' },
    });
  } catch (e) {
    return c.json({ error: 'R2 upload failed: ' + e.message }, 500);
  }

  return c.json({
    url: `https://uploads.sebastianvernis.space/${key}`,
    key,
    contentType: mime,
    size: file.size,
  });
});

// ── GET /images/* — Sirve imágenes almacenadas en R2 ─────────
images.get('/*', async (c) => {
  const key = c.req.param('*');
  if (!key) return c.text('Not Found', 404);

  try {
    const object = await c.env.UPLOADS.get(key);
    if (!object) return c.text('Not Found', 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(object.body, { status: 200, headers });
  } catch (e) {
    console.log('Image serve error:', e.message);
    return c.text('Not Found', 404);
  }
});

export default images;
