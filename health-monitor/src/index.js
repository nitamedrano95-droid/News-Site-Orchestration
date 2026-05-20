import { Hono } from 'hono';
import { runHealthChecks } from './checks.js';
import { renderDashboard } from './dashboard.js';

const app = new Hono();

// ── GET /api/health — Simple health check for uptime monitors ──
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── GET /api/status — JSON summary of current health ──
app.get('/api/status', async (c) => {
  const raw = await c.env.MONITOR_KV.get('last_check_result');
  if (!raw) return c.json({ status: 'pending', message: 'No checks run yet' });
  return c.json(JSON.parse(raw));
});

// ── GET /api/history — Historical check data ──
app.get('/api/history', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
  try {
    const rows = await c.env.MONITOR_DB.prepare(
      'SELECT id, timestamp, overall_status, data FROM health_snapshots ORDER BY timestamp DESC LIMIT ?'
    ).bind(limit).all();
    return c.json(rows.results || []);
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// ── GET /api/checks — Raw last check results ──
app.get('/api/checks', async (c) => {
  const raw = await c.env.MONITOR_KV.get('last_check_result');
  if (!raw) return c.json({ status: 'pending', message: 'No checks run yet' });
  return c.json(JSON.parse(raw));
});

// ── GET / — HTML Dashboard ──
app.get('/', async (c) => {
  try {
    const raw = await c.env.MONITOR_KV.get('last_check_result');
    const lastCheck = raw ? JSON.parse(raw) : null;

    const historyRows = await c.env.MONITOR_DB.prepare(
      'SELECT id, timestamp, overall_status FROM health_snapshots ORDER BY timestamp DESC LIMIT 20'
    ).all();
    const history = (historyRows.results || []).map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      overall_status: r.overall_status,
    }));

    const html = renderDashboard(lastCheck, history);
    return c.html(html);
  } catch (e) {
    return c.html(`<html><body><h1>Error</h1><pre>${e.message}</pre></body></html>`, 500);
  }
});

// ── POST /api/check — Trigger manual health check ──
app.post('/api/check', async (c) => {
  try {
    const result = await runHealthChecks(c.env);
    await c.env.MONITOR_KV.put('last_check_result', JSON.stringify(result));
    return c.json({ success: true, ...result });
  } catch (e) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ── Scheduled cron handler ──
export default {
  async scheduled(event, env, ctx) {
    console.log('[CRON] Starting health checks...');
    try {
      const result = await runHealthChecks(env);
      await env.MONITOR_KV.put('last_check_result', JSON.stringify(result));
      console.log(`[CRON] Complete: ${result.overall.status}, ${result.workers.length} workers checked`);
    } catch (e) {
      console.error('[CRON] Error:', e.message);
    }
  },

  fetch(req, env, ctx) {
    return app.fetch(req, env, ctx);
  },
};
