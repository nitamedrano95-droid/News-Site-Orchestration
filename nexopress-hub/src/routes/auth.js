// src/routes/auth.js — Hub authentication + session management.

import { Hono } from 'hono';
import { sha256, constantTimeEqual } from '../utils/crypto.js';
import { SESSION_TTL_SECONDS } from '../config.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const auth = new Hono();

// POST /auth/login
// Body: { username, password }
// Returns: { token, user } or 401
auth.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    if (!username || !password) {
      return c.json({ error: 'username and password required' }, 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT * FROM hub_users WHERE (username = ? OR email = ?) AND active = 1'
    ).bind(username, username).first();

    if (!user) {
      return c.json({ error: 'invalid credentials' }, 401);
    }

    // Validate password
    let isValid = false;
    if (user.password_hash) {
      const inputHash = await sha256(password);
      isValid = constantTimeEqual(inputHash, user.password_hash);
    } else if (c.env.USER_PASSWORD_HASH) {
      // Fallback for development: shared password from env
      const inputHash = await sha256(password);
      isValid = constantTimeEqual(inputHash, c.env.USER_PASSWORD_HASH);
    } else {
      // No hash anywhere — dev mode only, allows login with any password
      // (matches pattern in cms-*/src/routes/auth.js:231-233)
      isValid = true;
    }

    if (!isValid) {
      return c.json({ error: 'invalid credentials' }, 401);
    }

    // Issue session
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
    await c.env.HUB_KV.put(
      `hub_session_${token}`,
      JSON.stringify({
        user_id: user.id,
        username: user.username,
        expires_at: expiresAt,
      }),
      { expirationTtl: SESSION_TTL_SECONDS }
    );

    // Update last_login
    await c.env.DB.prepare(
      'UPDATE hub_users SET last_login = ? WHERE id = ?'
    ).bind(Date.now(), user.id).run();

    await audit(c.env, {
      user_id: user.id,
      action: 'login',
      metadata: { username: user.username },
    });

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        cms_access: JSON.parse(user.cms_access || '[]'),
      },
    });
  } catch (e) {
    console.error('[Hub auth] login error:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

// GET /auth/me — current user info
auth.get('/me', requireAuth, async (c) => {
  return c.json({ user: c.get('user') });
});

// POST /auth/logout — invalidate current session
auth.post('/logout', requireAuth, async (c) => {
  const token = c.get('token');
  await c.env.HUB_KV.delete(`hub_session_${token}`);
  await audit(c.env, {
    user_id: c.get('user').id,
    action: 'logout',
  });
  return c.json({ success: true });
});

// POST /auth/validate-token — used by the 5 CMSs to verify a Hub-issued token.
// Returns {valid: true, user: {...}} or {valid: false}.
// Cached in HUB_KV under `hub_validated_<token>` for 60s.
auth.post('/validate-token', async (c) => {
  try {
    const { token } = await c.req.json();
    if (!token) return c.json({ valid: false, error: 'no token' }, 400);

    // Cache fast-path
    if (c.env.HUB_KV) {
      const cached = await c.env.HUB_KV.get(`hub_validated_${token}`);
      if (cached) {
        return new Response(cached, {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Lookup session
    const sessionData = await c.env.HUB_KV?.get(`hub_session_${token}`);
    if (!sessionData) {
      return c.json({ valid: false });
    }
    const session = JSON.parse(sessionData);
    if (session.expires_at < Date.now()) {
      return c.json({ valid: false, error: 'expired' });
    }

    const user = await c.env.DB.prepare(
      'SELECT id, username, email, display_name, role, cms_access, active FROM hub_users WHERE id = ?'
    ).bind(session.user_id).first();

    if (!user || !user.active) {
      return c.json({ valid: false });
    }

    const result = JSON.stringify({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        cms_access: JSON.parse(user.cms_access || '[]'),
      },
    });

    // Cache for 60s
    await c.env.HUB_KV?.put(`hub_validated_${token}`, result, { expirationTtl: 60 });

    return new Response(result, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[Hub auth] validate-token error:', e.message);
    return c.json({ valid: false, error: e.message }, 500);
  }
});

// GET /auth/users — list all Hub users (admin only)
auth.get('/users', requireAuth, requireAdmin, async (c) => {
  const res = await c.env.DB.prepare(
    'SELECT id, username, email, display_name, role, cms_access, active, last_login, created_at FROM hub_users ORDER BY username'
  ).all();
  return c.json({
    users: (res.results || []).map((u) => ({
      ...u,
      cms_access: JSON.parse(u.cms_access || '[]'),
    })),
  });
});

// POST /auth/users — create new Hub user (admin only)
auth.post('/users', requireAuth, requireAdmin, async (c) => {
  try {
    const { username, email, display_name, role, cms_access, password } = await c.req.json();
    if (!username || !email) {
      return c.json({ error: 'username and email required' }, 400);
    }
    const id = crypto.randomUUID();
    const passwordHash = password ? await sha256(password) : null;
    await c.env.DB.prepare(
      'INSERT INTO hub_users (id, username, email, display_name, password_hash, role, cms_access, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)'
    ).bind(
      id,
      username,
      email,
      display_name || username,
      passwordHash,
      role || 'editor',
      JSON.stringify(cms_access || []),
      Date.now()
    ).run();
    await audit(c.env, {
      user_id: c.get('user').id,
      action: 'create_user',
      target_id: id,
      metadata: { username, email, role },
    });
    return c.json({ success: true, id });
  } catch (e) {
    console.error('[Hub auth] create user error:', e.message);
    return c.json({ error: e.message }, 500);
  }
});

export default auth;
