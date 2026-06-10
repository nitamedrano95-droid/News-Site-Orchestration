// src/utils/audit.js — write to HUB_AUDIT_LOG.
// Captures every proxy request, login, state change, etc.

export const audit = async (env, { user_id, action, cms, target_id, metadata }) => {
  try {
    await env.DB.prepare(
      'INSERT INTO hub_audit_log (user_id, action, cms, target_id, metadata, ts) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      user_id || null,
      action,
      cms || null,
      target_id || null,
      metadata ? JSON.stringify(metadata) : null,
      Date.now()
    ).run();
  } catch (e) {
    console.error('[Hub audit] write failed:', e.message);
  }
};
