// src/middleware/auth.js — Hub-aware authentication.
// Accepts: (1) ADMIN_TOKEN, (2) local KV session, (3) Hub-validated token.
// Local sessions take precedence; Hub fallback ensures cross-CMS SSO works.

const HUB_VALIDATION_CACHE_TTL = 60; // seconds

// Validate a token against the Hub. Returns user info or null.
// Caches the result in ARTICLES_KV for 60s to avoid roundtrips on every request.
const validateWithHub = async (token, env) => {
  if (!env.HUB_API_URL || !env.ARTICLES_KV) return null;

  // Cache fast-path
  const cacheKey = `hub_validated_${token}`;
  const cached = await env.ARTICLES_KV.get(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return parsed.valid ? parsed.user : null;
    } catch {
      // fall through to fresh validation
    }
  }

  try {
    const res = await fetch(`${env.HUB_API_URL}/api/auth/validate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.valid) return null;

    // Cache for 60s
    await env.ARTICLES_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: HUB_VALIDATION_CACHE_TTL });
    return data.user;
  } catch (e) {
    console.error('[Auth] Hub validation failed:', e.message);
    return null;
  }
};

export const checkAuth = async (c) => {
  const authHeader = c.req.header('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const adminToken = c.env.ADMIN_TOKEN;

  if (!token) return false;

  // 1. Master ADMIN_TOKEN
  if (adminToken && token === adminToken) {
    return true;
  }

  // 2. Local KV session
  if (c.env.ARTICLES_KV) {
    try {
      const sessionData = await c.env.ARTICLES_KV.get(`session_${token}`);
      if (sessionData) return true;
    } catch (e) {
      console.error(`[Auth] KV error: ${e.message}`);
    }
  }

  // 3. Hub-validated token (SSO)
  const hubUser = await validateWithHub(token, c.env);
  if (hubUser) {
    // Optionally attach the user to context for downstream handlers
    c.set('user', hubUser);
    c.set('auth_source', 'hub');
    return true;
  }

  // 4. Fallback de emergencia
  if (!adminToken) {
    return true;
  }

  console.warn(`[Auth] 401 - Token no reconocido: ${token.substring(0, 10)}...`);
  return false;
};

export const verifyPassword = async (password, storedHash) => {
  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  };
  return simpleHash(password) === storedHash;
};
