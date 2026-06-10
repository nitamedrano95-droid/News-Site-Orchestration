// src/routes/cms.js — Cross-CMS proxy + aggregator.
// Validates the user has cms_access for the requested CMS, then forwards the request.
// Reuses the Hub JWT so the target CMS can validate it via its own auth middleware.

import { Hono } from 'hono';
import { CMS_ENDPOINTS, CMS_LIST } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const cms = new Hono();

// All routes require Hub auth
cms.use('*', requireAuth);

// GET /cms — list of all 5 CMSs with health + stats (parallel ping)
cms.get('/', async (c) => {
  const user = c.get('user');
  const accessible = user.cms_access;

  // Ping each CMS in parallel with 5s timeout
  const healthChecks = await Promise.allSettled(
    CMS_LIST.map(async (cmsKey) => {
      const url = `${CMS_ENDPOINTS[cmsKey]}/api/health`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const res = await fetch(url, { signal: controller.signal });
        const data = res.ok ? await res.json() : null;
        return {
          cms: cmsKey,
          url: CMS_ENDPOINTS[cmsKey],
          status: res.ok ? 'up' : 'down',
          http_status: res.status,
          version: data?.version,
          timestamp: data?.timestamp,
          accessible: accessible.includes(cmsKey),
        };
      } catch (e) {
        return {
          cms: cmsKey,
          url: CMS_ENDPOINTS[cmsKey],
          status: 'down',
          error: e.name === 'AbortError' ? 'timeout' : e.message,
          accessible: accessible.includes(cmsKey),
        };
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  return c.json({
    cms: healthChecks.map((r) => r.value || r.reason),
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      cms_access: accessible,
    },
  });
});

// GET /cms/:cms/sites — list sites for a CMS
cms.get('/:cms/sites', async (c) => {
  const { cms: cmsKey } = c.req.param();
  return proxyTo(c, cmsKey, '/api/sites');
});

// GET /cms/:cms/articles — list articles for a CMS (proxies /api/articles)
cms.get('/:cms/articles', async (c) => {
  const { cms: cmsKey } = c.req.param();
  return proxyTo(c, cmsKey, '/api/articles');
});

// GET /cms/:cms/articles/:id — single article
cms.get('/:cms/articles/:id', async (c) => {
  const { cms: cmsKey, id } = c.req.param();
  return proxyTo(c, cmsKey, `/api/articles/id/${id}`);
});

// POST /cms/:cms/articles — create article
cms.post('/:cms/articles', async (c) => {
  const { cms: cmsKey } = c.req.param();
  return proxyTo(c, cmsKey, '/api/articles', { method: 'POST' });
});

// PATCH /cms/:cms/articles/:id — update article
cms.patch('/:cms/articles/:id', async (c) => {
  const { cms: cmsKey, id } = c.req.param();
  return proxyTo(c, cmsKey, `/api/articles/${id}`, { method: 'PUT' });
});

// DELETE /cms/:cms/articles/:id — delete article
cms.delete('/:cms/articles/:id', async (c) => {
  const { cms: cmsKey, id } = c.req.param();
  return proxyTo(c, cmsKey, `/api/articles/${id}`, { method: 'DELETE' });
});

// GET /cms/:cms/stats — proxy to /api/stats
cms.get('/:cms/stats', async (c) => {
  const { cms: cmsKey } = c.req.param();
  return proxyTo(c, cmsKey, '/api/stats');
});

// GET /cms/:cms/categories — proxy to /api/categories
cms.get('/:cms/categories', async (c) => {
  const { cms: cmsKey } = c.req.param();
  return proxyTo(c, cmsKey, '/api/categories');
});

// GET /cms/:cms/revision — proxy to /api/revision
cms.get('/:cms/revision', async (c) => {
  const { cms: cmsKey } = c.req.param();
  return proxyTo(c, cmsKey, '/api/revision');
});

// POST /cms/:cms/articles/:id/seo — upsert SEO fields
cms.post('/:cms/articles/:id/seo', async (c) => {
  const { cms: cmsKey, id } = c.req.param();
  return proxyTo(c, cmsKey, `/api/articles/${id}/seo`, { method: 'POST' });
});

// POST /cms/:cms/articles/:id/state — change state
cms.post('/:cms/articles/:id/state', async (c) => {
  const { cms: cmsKey, id } = c.req.param();
  return proxyTo(c, cmsKey, `/api/articles/${id}/state`, { method: 'POST' });
});

// ── Helper: proxy a request to the target CMS ──
const proxyTo = async (c, cmsKey, path, overrides = {}) => {
  const user = c.get('user');
  const token = c.get('token');

  if (!CMS_ENDPOINTS[cmsKey]) {
    return c.json({ error: `unknown cms: ${cmsKey}` }, 404);
  }
  if (!user.cms_access.includes(cmsKey)) {
    return c.json({ error: `forbidden: no access to ${cmsKey}` }, 403);
  }

  const baseUrl = CMS_ENDPOINTS[cmsKey];
  const queryString = new URL(c.req.url).search;
  const targetUrl = `${baseUrl}${path}${queryString}`;

  // Forward method, headers, body
  const init = {
    method: overrides.method || c.req.method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': c.req.header('Content-Type') || 'application/json',
    },
  };
  if (!['GET', 'HEAD'].includes(init.method)) {
    init.body = await c.req.raw.clone().arrayBuffer();
  }

  let res;
  try {
    res = await fetch(targetUrl, init);
  } catch (e) {
    console.error(`[Hub cms] fetch failed: ${cmsKey}${path} -> ${e.message}`);
    await audit(c.env, {
      user_id: user.id,
      action: 'proxy_error',
      cms: cmsKey,
      target_id: path,
      metadata: { error: e.message },
    });
    return c.json({ error: `upstream unreachable: ${e.message}` }, 502);
  }

  // Audit successful operations
  await audit(c.env, {
    user_id: user.id,
    action: `${init.method.toLowerCase()}_proxy`,
    cms: cmsKey,
    target_id: path,
    metadata: { upstream_status: res.status },
  });

  // Stream response back
  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
    },
  });
};

export default cms;
