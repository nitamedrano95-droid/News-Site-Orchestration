// src/index.js — NexoPress Hub Worker entry point.
// Orchestrates the 5 CMS Workers, manages SSO, exposes cross-CMS APIs.
// The HUB UI itself is a separate Cloudflare Pages app at hub.sebastianvernis.space.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getAllowedOrigins } from './config.js';
import authRoutes from './routes/auth.js';
import cmsRoutes from './routes/cms.js';
import seoRoutes from './routes/seo.js';

const app = new Hono().basePath('/api');

// CORS
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    const c = getAllowedOrigins({ ALLOWED_ORIGINS: globalThis?.ALLOWED_ORIGINS || '' });
    if (c.includes(origin)) return origin;
    if (origin.endsWith('.workers.dev')) return origin;
    if (origin.endsWith('.pages.dev')) return origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin;
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
  credentials: true,
}));

// Mount routes
app.route('/auth', authRoutes);
app.route('/cms',  cmsRoutes);
app.route('/seo',  seoRoutes);

// Health check (no auth)
app.get('/health', (c) => c.json({
  status:    'ok',
  service:   'nexopress-hub',
  timestamp: new Date().toISOString(),
  version:   '1.0.0',
}));

// Root
app.get('/', (c) => c.json({
  service: 'NexoPress Hub',
  endpoints: [
    'GET  /api/health',
    'POST /api/auth/login',
    'GET  /api/auth/me',
    'POST /api/auth/logout',
    'POST /api/auth/validate-token',
    'GET  /api/auth/users',
    'POST /api/auth/users',
    'GET  /api/cms',
    'GET  /api/cms/:cms/sites',
    'GET  /api/cms/:cms/articles',
    'GET  /api/cms/:cms/articles/:id',
    'POST /api/cms/:cms/articles',
    'PATCH /api/cms/:cms/articles/:id',
    'DELETE /api/cms/:cms/articles/:id',
    'GET  /api/cms/:cms/stats',
    'GET  /api/cms/:cms/categories',
    'GET  /api/cms/:cms/revision',
    'POST /api/cms/:cms/articles/:id/seo',
    'POST /api/cms/:cms/articles/:id/state',
    'GET  /api/seo/sitemap/:siteSlug',
  ],
}));

export default {
  async fetch(request, env, ctx) {
    // Stash env ALLOWED_ORIGINS where the CORS callback can read it
    globalThis.ALLOWED_ORIGINS = env.ALLOWED_ORIGINS || '';
    return app.fetch(request, env, ctx);
  },
};
