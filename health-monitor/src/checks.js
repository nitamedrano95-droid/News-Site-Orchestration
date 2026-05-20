import { getCmsWorkers, THRESHOLDS } from './config.js';
import { notifyTelegram, formatDuration } from './utils.js';

export async function runHealthChecks(env) {
  const workers = getCmsWorkers(env);
  const results = [];

  for (const worker of workers) {
    const check = await checkWorker(env, worker);
    results.push(check);
  }

  const overall = assessOverall(results);
  await storeSnapshot(env, results, overall);

  const alertSent = await sendAlertsIfNeeded(env, results, overall);

  return { timestamp: new Date().toISOString(), overall, workers: results, alertSent };
}

async function checkWorker(env, worker) {
  const { binding, name } = worker;
  const svc = env[binding];
  const startedAt = Date.now();
  const result = {
    ...worker,
    reachable: false,
    health: null,
    cronStatus: null,
    diagnostic: null,
    error: null,
    responseTimeMs: 0,
    status: 'unknown',
    siteStats: { total: 0, healthy: 0, warning: 0, down: 0 },
  };

  if (!svc || typeof svc.fetch !== 'function') {
    result.error = `Service binding ${binding} not available`;
    result.status = 'down';
    return result;
  }

  try {
    const healthRes = await svc.fetch(`https://${name}/api/health`);
    result.responseTimeMs = Date.now() - startedAt;
    if (!healthRes.ok) {
      result.error = `Health endpoint returned ${healthRes.status}`;
      result.status = 'down';
      return result;
    }
    result.reachable = true;
    result.health = await healthRes.json();

    const [cronRes, diagRes] = await Promise.all([
      svc.fetch(`https://${name}/api/cron/status`).then(r => r.ok ? r.json() : null),
      svc.fetch(`https://${name}/api/cron/diagnostic`).then(r => r.ok ? r.json() : null),
    ]);

    result.cronStatus = cronRes;
    result.diagnostic = diagRes;

    result.status = assessWorkerStatus(result);
    result.siteStats = computeSiteStats(result);
  } catch (e) {
    result.error = e.message;
    result.status = 'down';
  }

  return result;
}

function assessWorkerStatus(result) {
  if (!result.reachable) return 'down';

  const cron = result.cronStatus;
  if (!cron || !cron.lastRun || cron.lastRun === 'Never') return 'warning';

  const elapsed = Date.now() - new Date(cron.lastRun).getTime();
  if (elapsed > THRESHOLDS.cronMaxAgeMs) return 'warning';

  if (cron.taskDetails) {
    for (const [key, task] of Object.entries(cron.taskDetails)) {
      if (task.isError) return 'warning';
    }
  }

  const diag = result.diagnostic;
  if (diag && diag.summary) {
    if (diag.summary.canPublishNow === 0 && diag.summary.totalSites > 0) return 'warning';
  }

  return 'healthy';
}

function computeSiteStats(result) {
  const diag = result.diagnostic;
  if (!diag || !diag.diagnostics) {
    return { total: result.siteCount, healthy: 0, warning: 0, down: 0 };
  }

  let healthy = 0, warning = 0, down = 0;
  const now = Date.now();

  for (const site of diag.diagnostics) {
    const timerElapsedMs = site.timer.elapsedMin * 60000;
    if (timerElapsedMs > THRESHOLDS.fbMaxAgeMs && site.timer.lastPostTime !== 0) {
      down++;
    } else if (site.articles.withValidImage < THRESHOLDS.pendingWarning) {
      warning++;
    } else {
      healthy++;
    }
  }

  return { total: diag.diagnostics.length, healthy, warning, down };
}

function assessOverall(results) {
  const counts = { healthy: 0, warning: 0, down: 0 };
  for (const r of results) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }

  const status = counts.down > 0 ? 'critical' : counts.warning > 0 ? 'degraded' : 'healthy';
  const allOk = status === 'healthy';

  return { status, counts, allOk, checkedAt: new Date().toISOString() };
}

async function storeSnapshot(env, results, overall) {
  try {
    const id = crypto.randomUUID();
    await env.MONITOR_DB.prepare(`
      INSERT INTO health_snapshots (id, timestamp, overall_status, data)
      VALUES (?, datetime('now'), ?, ?)
    `).bind(id, overall.status, JSON.stringify({ results, overall })).run();
  } catch (e) {
    console.error('[STORE] Failed to store snapshot:', e.message);
  }
}

async function sendAlertsIfNeeded(env, results, overall) {
  if (overall.allOk) return false;

  const lastAlertRaw = await env.MONITOR_KV.get('last_alert_sent');
  const lastAlert = lastAlertRaw ? parseInt(lastAlertRaw, 10) : 0;

  if (Date.now() - lastAlert < 30 * 60 * 1000) return false;

  let message = `<b>🚨 Health Monitor Alert</b>\n`;
  message += `Status: <b>${overall.status.toUpperCase()}</b>\n\n`;

  for (const r of results) {
    const icon = r.status === 'healthy' ? '✅' : r.status === 'warning' ? '⚠️' : '🔴';
    message += `${icon} <b>${r.name}</b> (${r.status})\n`;
    message += `   Response: ${r.responseTimeMs}ms\n`;

    if (r.error) message += `   Error: ${r.error}\n`;

    if (r.cronStatus && r.cronStatus.lastRun && r.cronStatus.lastRun !== 'Never') {
      const elapsed = Date.now() - new Date(r.cronStatus.lastRun).getTime();
      message += `   Last cron: ${formatDuration(elapsed)} ago\n`;
    }

    if (r.siteStats) {
      message += `   Sites: ${r.siteStats.healthy} healthy, ${r.siteStats.warning} warning, ${r.siteStats.down} stalled\n`;
    }
    message += '\n';
  }

  message += `<a href="https://health-monitor.sebastianvernis.workers.dev">View Dashboard</a>`;

  await notifyTelegram(env, message);
  await env.MONITOR_KV.put('last_alert_sent', Date.now().toString());

  return true;
}
