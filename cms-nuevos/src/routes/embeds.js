// src/routes/embeds.js — Resolución server-side de embeds de redes sociales.
//
// El frontend (EditorToolbar.jsx) llama a este endpoint en lugar de inyectar
// `<blockquote class="twitter-tweet">` + `widgets.js`, que ya no genera la
// miniatura del tuit de forma fiable. Aquí consultamos api.fxtwitter.com
// (con fallback a api.vxtwitter.com), generamos HTML estático listo para
// incrustar en el artículo, y lo cacheamos en KV para no martillar la API.

import { Hono } from 'hono';
import { checkAuth } from '../middleware/auth.js';

const embeds = new Hono();

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h: el contenido de un tuit cambia muy poco.
const FX_TIMEOUT_MS = 6000;

// ── Helpers ───────────────────────────────────────────────────

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const escAttr = (s) => esc(s);

const formatDate = (epochSeconds) => {
  if (!epochSeconds) return '';
  try {
    const d = new Date(epochSeconds * 1000);
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  } catch (_) {
    return '';
  }
};

const formatCount = (n) => {
  if (n == null) return '';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
};

// Extrae (user, id) de URLs tipo https://x.com/user/status/123 o https://twitter.com/...
const parseXUrl = (rawUrl) => {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.toLowerCase();
    if (!['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'].includes(host)) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 3) return null;
    if (parts[1].toLowerCase() !== 'status') return null;
    const screen_name = parts[0];
    const id = parts[2];
    if (!/^\d+$/.test(id)) return null;
    return { screen_name, id };
  } catch (_) {
    return null;
  }
};

// Llama a api.fxtwitter.com con fallback a api.vxtwitter.com
const fetchTweet = async (screen_name, id) => {
  const endpoints = [
    `https://api.fxtwitter.com/${screen_name}/status/${id}`,
    `https://api.vxtwitter.com/${screen_name}/status/${id}`,
  ];

  for (const url of endpoints) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), FX_TIMEOUT_MS);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: ctrl.signal,
      });
      clearTimeout(tid);
      if (!res.ok) continue;
      const data = await res.json();
      // fxtwitter: {code:200, tweet:{...}} ; vxtwitter: objeto plano del tuit
      const tweet = data?.tweet || (data?.tweetID ? data : null);
      if (tweet && (tweet.id || tweet.text)) return tweet;
    } catch (_) {
      // intentar siguiente
    }
  }
  return null;
};

// Genera el HTML estático del card del tuit (autor, texto, media, métricas).
const buildTweetHtml = (tweet, originalUrl) => {
  const author = tweet.author || {};
  const name = esc(author.name || tweet.user_name || author.screen_name || 'X user');
  const screen = esc(author.screen_name || '');
  const avatar = escAttr(author.avatar_url || '');
  const text = esc(tweet.text || '');
  const date = formatDate(tweet.created_timestamp);
  const replies = formatCount(tweet.replies);
  const retweets = formatCount(tweet.retweets);
  const likes = formatCount(tweet.likes);
  const verified = !!(author.verification?.verified || author.verified);

  const verifiedBadge = verified
    ? `<svg class="np-x-verified" viewBox="0 0 22 22" aria-label="Verificado" width="16" height="16"><path fill="#1d9bf0" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.256.14-1.857-.197-.6-.578-1.131-1.079-1.521-.42-.314-.91-.518-1.426-.594-.526-.077-1.064.013-1.55.265-.413-.316-.906-.518-1.43-.594-.526-.077-1.064.013-1.55.265-.485-.252-1.024-.342-1.55-.265-.516.076-1.006.28-1.426.594-.5.39-.881.921-1.078 1.521-.13.601-.084 1.25.14 1.857-.587.274-1.084.706-1.439 1.246-.354.541-.551 1.17-.569 1.816.018.646.215 1.275.57 1.816.354.54.852.972 1.438 1.246-.223.607-.27 1.256-.14 1.857.197.6.578 1.131 1.079 1.521.42.314.91.518 1.426.594.526.077 1.064-.013 1.55-.265.413.316.906.518 1.43.594.526.077 1.064-.013 1.55-.265.485.252 1.024.342 1.55.265.516-.076 1.006-.28 1.426-.594.5-.39.881-.921 1.078-1.521.13-.601.084-1.25-.14-1.857.587-.274 1.084-.706 1.439-1.246.354-.541.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>`
    : '';

  // Media (imágenes / video) si están presentes
  let mediaHtml = '';
  const medias = tweet.media?.all || tweet.media_extended || [];
  if (Array.isArray(medias) && medias.length > 0) {
    const items = medias.slice(0, 4).map((m) => {
      const url = escAttr(m.url || m.media_url_https || m.media_url || '');
      const type = m.type || (m.video_info ? 'video' : 'photo');
      if (type === 'video' || type === 'gif') {
        const variants = (m.video_info?.variants || [])
          .filter((v) => v.content_type === 'video/mp4')
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const mp4 = variants[0]?.url || url;
        return `<div class="np-x-media"><video controls preload="metadata" playsinline poster="${escAttr(m.thumbnail_url || url)}" src="${escAttr(mp4)}" style="width:100%;display:block;border-radius:12px;"></video></div>`;
      }
      return `<div class="np-x-media"><img src="${url}" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:100%;display:block;border-radius:12px;" /></div>`;
    }).join('');
    mediaHtml = `<div class="np-x-medias">${items}</div>`;
  }

  const profileUrl = escAttr(author.url || `https://x.com/${screen}`);

  return `
<div class="np-x-embed" data-np-x-id="${escAttr(tweet.id || '')}">
  <div class="np-x-header">
    <a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="np-x-avatar-link">
      <img class="np-x-avatar" src="${avatar}" alt="${name}" referrerpolicy="no-referrer" />
    </a>
    <div class="np-x-author">
      <a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="np-x-name">${name}${verifiedBadge}</a>
      <a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="np-x-screen">@${screen}</a>
    </div>
    <a href="${escAttr(originalUrl)}" target="_blank" rel="noopener noreferrer" class="np-x-brand" aria-label="Ver en X">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    </a>
  </div>
  <div class="np-x-text">${text}</div>
  ${mediaHtml}
  <div class="np-x-footer">
    <a href="${escAttr(originalUrl)}" target="_blank" rel="noopener noreferrer" class="np-x-date">${date}</a>
    <div class="np-x-stats">
      ${replies ? `<span><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z"/></svg>${replies}</span>` : ''}
      ${retweets ? `<span><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/></svg>${retweets}</span>` : ''}
      ${likes ? `<span><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z"/></svg>${likes}</span>` : ''}
    </div>
  </div>
  <a href="${escAttr(originalUrl)}" target="_blank" rel="noopener noreferrer" class="np-x-permalink">Ver publicación original en X</a>
</div>`.trim();
};

// ── POST /api/embeds/x — Resolver URL de X a HTML embebido ──
// Body: { url: "https://x.com/<user>/status/<id>" }
// Respuesta: { url, html, cached, tweet: { author, text, ... } }
embeds.post('/x', async (c) => {
  if (!await checkAuth(c)) return c.json({ error: 'Unauthorized' }, 401);

  let body;
  try {
    body = await c.req.json();
  } catch (_) {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  const rawUrl = String(body?.url || '').trim();
  if (!rawUrl) return c.json({ error: 'Missing url' }, 400);

  const parsed = parseXUrl(rawUrl);
  if (!parsed) return c.json({ error: 'Not a valid x.com / twitter.com status URL' }, 400);

  const cacheKey = `embed_x:${parsed.screen_name.toLowerCase()}:${parsed.id}`;

  // 1) Cache KV
  if (c.env.ARTICLES_KV) {
    try {
      const cached = await c.env.ARTICLES_KV.get(cacheKey);
      if (cached) {
        const parsed_cached = JSON.parse(cached);
        return c.json({ url: rawUrl, cached: true, ...parsed_cached });
      }
    } catch (_) {
      // seguir sin cache
    }
  }

  // 2) Fetch desde fxtwitter / vxtwitter
  const tweet = await fetchTweet(parsed.screen_name, parsed.id);
  if (!tweet) {
    return c.json({ error: 'Tweet not found or unreachable' }, 502);
  }

  const html = buildTweetHtml(tweet, rawUrl);
  const payload = {
    html,
    tweet: {
      id: tweet.id,
      text: tweet.text,
      author: tweet.author || { screen_name: tweet.user_name },
      created_at: tweet.created_at || null,
      created_timestamp: tweet.created_timestamp || null,
      media: tweet.media || null,
    },
  };

  // 3) Guardar en cache (best-effort)
  if (c.env.ARTICLES_KV) {
    try {
      await c.env.ARTICLES_KV.put(cacheKey, JSON.stringify(payload), {
        expirationTtl: CACHE_TTL_SECONDS,
      });
    } catch (_) {
      // no bloquear la respuesta por un fallo de cache
    }
  }

  return c.json({ url: rawUrl, cached: false, ...payload });
});

export default embeds;
