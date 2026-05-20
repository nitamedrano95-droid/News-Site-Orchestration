import { escapeHtml, timeAgo, formatDuration } from './utils.js';

export function renderDashboard(lastCheck, history) {
  const overall = lastCheck?.overall;
  const workers = lastCheck?.workers || [];

  const statusColor = overall?.status === 'healthy' ? '#22c55e'
    : overall?.status === 'degraded' ? '#eab308'
    : '#ef4444';

  const statusLabel = overall?.status === 'healthy' ? 'Healthy'
    : overall?.status === 'degraded' ? 'Degraded'
    : 'Critical';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NexoPress Health Monitor</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #0f172a; color: #e2e8f0; min-height: 100vh;
  }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }

  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
  .header h1 { font-size: 24px; font-weight: 700; }
  .header .subtitle { color: #94a3b8; font-size: 14px; }
  .badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 20px; border-radius: 9999px; font-size: 14px; font-weight: 600;
  }

  /* CMS Cards */
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px; }
  .card {
    background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px;
    transition: border-color 0.2s;
  }
  .card:hover { border-color: #475569; }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .card-name { font-size: 16px; font-weight: 600; }
  .card-ping { font-size: 12px; color: #64748b; }
  .card-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
  .stat { text-align: center; }
  .stat-value { font-size: 20px; font-weight: 700; }
  .stat-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat.healthy .stat-value { color: #22c55e; }
  .stat.warning .stat-value { color: #eab308; }
  .stat.down .stat-value { color: #ef4444; }
  .card-error { color: #ef4444; font-size: 13px; margin-top: 8px; padding: 8px; background: #2d1b1b; border-radius: 6px; }
  .card-detail { font-size: 13px; color: #94a3b8; margin-top: 4px; }

  /* Site table */
  .site-table { width: 100%; margin-top: 16px; border-collapse: collapse; font-size: 13px; display: none; }
  .site-table.visible { display: table; }
  .site-table th { text-align: left; padding: 6px 8px; color: #64748b; font-weight: 500; border-bottom: 1px solid #334155; }
  .site-table td { padding: 6px 8px; border-bottom: 1px solid #1e293b; }
  .toggle-sites { font-size: 12px; color: #3b82f6; cursor: pointer; text-decoration: none; }
  .toggle-sites:hover { text-decoration: underline; }

  /* History */
  .history { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
  .history h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
  .history-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #1e293b; }
  .history-item:last-child { border-bottom: none; }
  .history-time { color: #64748b; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }

  /* Cron status */
  .cron-info { font-size: 18px; font-weight: 700; margin-top: 8px; }

  .footer { text-align: center; padding: 24px; color: #475569; font-size: 12px; }
  .refresh-note { color: #64748b; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <h1>NexoPress Health Monitor</h1>
      <div class="subtitle">Last check: ${escapeHtml(lastCheck?.timestamp ? timeAgo(lastCheck.timestamp) : 'Never')}</div>
    </div>
    <div class="badge" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55;">
      <span style="width:10px;height:10px;border-radius:50%;background:${statusColor};display:inline-block;"></span>
      ${statusLabel}
    </div>
  </div>

  <div class="grid">
    ${workers.map(w => renderWorkerCard(w)).join('')}
  </div>

  <div class="history">
    <h2>Check History (last 20)</h2>
    ${(history || []).map(h => {
      const s = h.overall_status;
      const color = s === 'healthy' ? '#22c55e' : s === 'degraded' ? '#eab308' : '#ef4444';
      return `<div class="history-item">
        <span><span class="dot" style="background:${color}"></span>${escapeHtml(s.toUpperCase())}</span>
        <span class="history-time">${escapeHtml(h.timestamp)}</span>
      </div>`;
    }).join('')}
    ${(!history || history.length === 0) ? '<div class="cron-info" style="color:#64748b">No history yet — waiting for first cron run.</div>' : ''}
  </div>

  <div class="footer">
    NexoPress Health Monitor &mdash; Runs every 15 minutes
    <div class="refresh-note">Auto-refreshes every 60s</div>
  </div>
</div>
<script>
setTimeout(() => location.reload(), 60000);
document.querySelectorAll('.toggle-sites').forEach(btn => {
  btn.addEventListener('click', () => {
    const table = btn.parentElement.nextElementSibling;
    table.classList.toggle('visible');
    btn.textContent = table.classList.contains('visible') ? 'Hide sites' : 'Show sites';
  });
});
</script>
</body>
</html>`;
}

function renderWorkerCard(w) {
  const color = w.status === 'healthy' ? '#22c55e'
    : w.status === 'warning' ? '#eab308'
    : w.status === 'down' ? '#ef4444'
    : '#64748b';

  const sites = w.siteStats || { healthy: 0, warning: 0, down: 0 };

  const cronAge = w.cronStatus?.lastRun && w.cronStatus.lastRun !== 'Never'
    ? formatDuration(Date.now() - new Date(w.cronStatus.lastRun).getTime())
    : 'N/A';

  let detailsHtml = '';

  if (w.diagnostic?.diagnostics) {
    const rows = w.diagnostic.diagnostics.map(site => {
      const timerOk = !(site.timer.elapsedMin > 480 && site.timer.lastPostTime !== 0);
      const hasArticles = site.articles.withValidImage > 0;
      const siteColor = !timerOk ? '#ef4444' : !hasArticles ? '#eab308' : '#22c55e';
      return `<tr>
        <td style="color:${siteColor}">●</td>
        <td>${escapeHtml(site.site)}</td>
        <td>${site.timer.elapsedMin}m</td>
        <td>${site.timer.ready ? 'Yes' : 'No'}</td>
        <td>${site.articles.pending}</td>
        <td>${site.articles.withValidImage}</td>
      </tr>`;
    }).join('');

    detailsHtml = `
      <a class="toggle-sites">Show sites (${w.diagnostic.diagnostics.length})</a>
      <table class="site-table">
        <thead><tr>
          <th></th><th>Site</th><th>Timer</th><th>Ready</th><th>Pending</th><th>With Img</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  return `<div class="card" style="border-left: 3px solid ${color}">
    <div class="card-header">
      <span class="card-name">${escapeHtml(w.name)}</span>
      <span style="color:${color};font-weight:600;text-transform:uppercase;font-size:12px">${escapeHtml(w.status)}</span>
    </div>
    <div class="card-ping">${w.responseTimeMs}ms · cron ${cronAge} ago</div>
    <div class="card-stats">
      <div class="stat healthy"><div class="stat-value">${sites.healthy}</div><div class="stat-label">Healthy</div></div>
      <div class="stat warning"><div class="stat-value">${sites.warning}</div><div class="stat-label">Warning</div></div>
      <div class="stat down"><div class="stat-value">${sites.down}</div><div class="stat-label">Stalled</div></div>
    </div>
    ${w.error ? `<div class="card-error">${escapeHtml(w.error)}</div>` : ''}
    ${detailsHtml}
  </div>`;
}
