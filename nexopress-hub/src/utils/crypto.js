// src/utils/crypto.js — Hashing + constant-time compare helpers.
// Matches the SHA-256 plain hash format used across the 5 CMSs (cms-*/src/routes/auth.js).
// In production, migrate to bcrypt or argon2; for now, consistent with existing infra.

export const sha256 = async (text) => {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Constant-time string comparison to prevent timing side-channels.
export const constantTimeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};
