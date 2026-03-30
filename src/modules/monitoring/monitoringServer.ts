import http from 'http';
import type { StatusStore } from './statusStore';
import type { Logger } from '../utils/logger';

const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Polymarket Bot Monitor</title>
  <style>
    body { font-family: monospace; background: #0d1117; color: #c9d1d9; margin: 0; padding: 24px; }
    h1 { color: #58a6ff; margin-bottom: 4px; }
    .subtitle { color: #8b949e; margin-bottom: 24px; font-size: 12px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .card h2 { color: #f0f6fc; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .badge.running { background: #238636; color: #fff; }
    .badge.stopped { background: #da3633; color: #fff; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #21262d; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .label { color: #8b949e; }
    .value { color: #e6edf3; }
    .event { padding: 4px 0; font-size: 12px; border-bottom: 1px solid #21262d; }
    .event:last-child { border-bottom: none; }
    .event .ts { color: #8b949e; margin-right: 8px; }
    .event.poll .type { color: #58a6ff; }
    .event.trade_detected .type { color: #d2a8ff; }
    .event.trade_executed .type { color: #3fb950; }
    .event.error .type { color: #f85149; }
    .event.started .type { color: #e3b341; }
    .controls { color: #8b949e; font-size: 11px; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>🤖 Polymarket Copy Trading Bot</h1>
  <p class="subtitle">Monitoring Dashboard</p>
  <div id="app">Loading...</div>
  <div class="controls">
    Auto-refresh: <button id="toggleBtn" style="background:none;border:1px solid #30363d;color:#c9d1d9;cursor:pointer;padding:2px 8px;font-size:11px;border-radius:4px">Pause</button>
    <span id="refreshInfo" style="margin-left:8px"></span>
  </div>
  <script>
    var refreshInterval = null;
    var paused = false;

    async function load() {
      try {
        const res = await fetch('/status');
        const data = await res.json();
        const s = data.status;
        const uptime = s.startedAt ? Math.floor((Date.now() - s.startedAt) / 1000) : null;
        const lastPoll = s.lastPollAt ? new Date(s.lastPollAt).toLocaleTimeString() : 'never';
        const started = s.startedAt ? new Date(s.startedAt).toLocaleString() : 'not started';
        const events = (s.recentEvents || []).slice().reverse();
        document.getElementById('app').innerHTML = \`
          <div class="card">
            <h2>Status</h2>
            <div class="row"><span class="label">State</span><span class="value"><span class="badge \${s.running ? 'running' : 'stopped'}">\${s.running ? 'RUNNING' : 'STOPPED'}</span></span></div>
            <div class="row"><span class="label">Started</span><span class="value">\${started}</span></div>
            <div class="row"><span class="label">Uptime</span><span class="value">\${uptime !== null ? uptime + 's' : 'n/a'}</span></div>
            <div class="row"><span class="label">Wallet</span><span class="value">\${s.walletAddress || 'n/a'}</span></div>
          </div>
          <div class="card">
            <h2>Configuration</h2>
            <div class="row"><span class="label">Monitored traders</span><span class="value">\${s.monitoredTraderCount}</span></div>
            <div class="row"><span class="label">Poll interval</span><span class="value">\${s.pollIntervalSeconds}s</span></div>
            <div class="row"><span class="label">Last poll</span><span class="value">\${lastPoll}</span></div>
          </div>
          <div class="card">
            <h2>Errors</h2>
            <div class="row"><span class="label">Error count</span><span class="value">\${s.errorCount}</span></div>
            <div class="row"><span class="label">Last error</span><span class="value">\${s.lastError || 'none'}</span></div>
          </div>
          <div class="card">
            <h2>Recent Events (\${events.length})</h2>
            \${events.length === 0 ? '<div style="color:#8b949e;font-size:13px">No events yet.</div>' : events.map(e => \`
              <div class="event \${e.type}">
                <span class="ts">\${new Date(e.timestamp).toLocaleTimeString()}</span>
                <span class="type">[\${e.type.toUpperCase()}]</span>
                \${e.message}
              </div>
            \`).join('')}
          </div>
        \`;
        document.getElementById('refreshInfo').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
      } catch (err) {
        document.getElementById('app').innerHTML = '<div style="color:#f85149">Failed to load status: ' + err + '</div>';
      }
    }

    function startAutoRefresh() {
      refreshInterval = setInterval(load, 10000);
    }

    document.getElementById('toggleBtn').addEventListener('click', function() {
      paused = !paused;
      if (paused) {
        clearInterval(refreshInterval);
        this.textContent = 'Resume';
      } else {
        startAutoRefresh();
        this.textContent = 'Pause';
      }
    });

    load();
    startAutoRefresh();
  </script>
</body>
</html>`;

export function createMonitoringServer(
  store: StatusStore,
  port: number,
  host: string,
  logger?: Logger,
): http.Server {
  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';

    if (url === '/health') {
      const status = store.getStatus();
      const body = JSON.stringify({
        ok: true,
        running: status.running,
        uptime: status.startedAt ? Math.floor((Date.now() - status.startedAt) / 1000) : null,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    } else if (url === '/status') {
      const status = store.getStatus();
      const body = JSON.stringify({ status }, null, 2);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    } else if (url === '/' || url === '/dashboard') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML_DASHBOARD);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, host, () => {
    if (logger) {
      logger.info(
        `Monitoring server listening on http://${host}:${port} (health: /health, status: /status, dashboard: /)`,
      );
    }
  });

  server.on('error', (err: Error) => {
    if (logger) {
      logger.error('[monitoring] Server error', err);
    }
  });

  return server;
}
