// src/middleware/auth.js — Hub session token validation.
// Sessions live in HUB_KV as key `hub_session_<token>`, value JSON {user_id, expires_at}.

import { getAllowedOrigins } from '../config.js';

const extractToken = (c) => {
  const authHeader = c.req.header('Authorization') || '';
  return authHeader.replace(/^Bearer\s+/i, '').trim();
};

export const requireAuth = async (c, next) => {
  const token = extractToken(c);
  if (!token) return c.json({ error: 'unauthorized' }, 401);

  // Fast path: KV lookup
  if (c.env.HUB_KV) {
    const sessionData = await c.env.HUB_KV.get(`hub_session_${token}`);
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        if (session.expires_at > Date.now()) {
          const user = await c.env.DB.prepare(
            'SELECT id, username, email, display_name, role, cms_access, active FROM hub_users WHERE id = ?'
          ).bind(session.user_id).first();
          if (user && user.active) {
            c.set('user', {
              id: user.id,
              username: user.username,
              email: user.email,
              display_name: user.display_name,
              role: user.role,
              cms_access: JSON.parse(user.cms_access || '[]'),
            });
            c.set('token', token);
            await next();
            return;
          }
        }
      } catch (e) {
        console.error('[Hub auth] session parse error:', e.message);
      }
    }
  }

  return c.json({ error: 'unauthorized' }, 401);
};

export const requireAdmin = async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'admin required' }, 403);
  }
  await next();
};

// CORS helper for routes that need to allow the Hub frontend
export const corsHeaders = (env, origin) => {
  const allowed = getAllowedOrigins(env);
  const allowOrigin = origin && (allowed.includes(origin) || origin.endsWith('.workers.dev') || origin.endsWith('.pages.dev') || origin.includes('localhost') || origin.includes('127.0.0.1'))
    ? origin
    : '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
};
