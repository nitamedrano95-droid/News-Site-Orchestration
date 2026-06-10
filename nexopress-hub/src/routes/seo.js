// src/routes/seo.js — Sitemap XML + cross-CMS SEO utilities.

import { Hono } from 'hono';
import { CMS_ENDPOINTS, CMS_LIST } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

const seo = new Hono();

// GET /seo/sitemap/:siteSlug — Google News compatible sitemap
// Aggregates published articles from all CMSs for the given site.
seo.get('/sitemap/:siteSlug', async (c) => {
  const { siteSlug } = c.req.param();
  // Articles from the last 48h (Google News window)
  const sinceMs = Date.now() - 48 * 60 * 60 * 1000;

  const allArticles = await Promise.all(
    CMS_LIST.map(async (cmsKey) => {
      const url = `${CMS_ENDPOINTS[cmsKey]}/api/articles?site=${siteSlug}&limit=100`;
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.articles || []).map((a) => ({ ...a, cms: cmsKey }));
      } catch {
        return [];
      }
    })
  );

  const flat = allArticles.flat();
  const recent = flat
    .filter((a) => a.publishedAt && new Date(a.publishedAt).getTime() >= sinceMs)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recent
  .map(
    (a) => `  <url>
    <loc>${escapeXml(a.url || `https://${siteSlug}.pages.dev/articulo/?slug=${a.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(a.site || siteSlug)}</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${new Date(a.publishedAt).toISOString()}</news:publication_date>
      <news:title><![CDATA[${a.title}]]></news:title>
      <news:keywords>${escapeXml((a.tags || []).join(', '))}</news:keywords>
    </news:news>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

const escapeXml = (s) => {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export default seo;
