import * as http from 'http';
import type { Logger } from '../utils/logger';
import { botState } from './botState';

export type StatusServerConfig = {
  port: number;
  logger: Logger;
};

const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="10">
  <title>Polymarket Bot Status</title>
  <style>
    body { font-family: monospace; background: #0d1117; color: #c9d1d9; padding: 2rem; margin: 0; }
    h1 { color: #58a6ff; margin-bottom: 0.25rem; }
    h2 { color: #8b949e; margin-top: 1.5rem; }
    a { color: #58a6ff; }
    .ok   { color: #3fb950; }
    .warn { color: #d29922; }
    .err  { color: #f85149; }
    table { border-collapse: collapse; width: 100%; margin-top: 0.5rem; }
    th, td { border: 1px solid #30363d; padding: 0.4rem 0.8rem; text-align: left; }
    th { background: #161b22; color: #8b949e; }
    #content { margin-top: 1rem; }
    .subtitle { color: #8b949e; font-size: 0.875rem; }
  </style>
</head>
<body>
  <h1>🤖 Polymarket Copy Trading Bot</h1>
  <p class="subtitle">Auto-refreshes every 10s &nbsp;|&nbsp; <a href="/status">Raw JSON (/status)</a> &nbsp;|&nbsp; <a href="/health">Health (/health)</a></p>
  <div id="content">Loading…</div>
  <script>
    function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    async function load() {
      try {
        const r = await fetch('/status');
        const s = await r.json();
        const statusLabel = s.running
          ? '<span class="ok">RUNNING</span>'
          : '<span class="err">STOPPED</span>';
        const uptime = s.startedAt
          ? Math.floor((Date.now() - s.startedAt) / 1000) + 's'
          : 'N/A';
        const lastPoll = s.lastPollAt ? new Date(s.lastPollAt).toISOString() : 'Never';
        let html = '<h2>Bot Info</h2><table><tr><th>Field</th><th>Value</th></tr>';
        html += '<tr><td>Status</td><td>' + statusLabel + '</td></tr>';
        html += '<tr><td>Uptime</td><td>' + esc(uptime) + '</td></tr>';
        html += '<tr><td>Monitored Traders</td><td>' + esc(s.monitoredAddresses) + '</td></tr>';
        html += '<tr><td>Poll Interval</td><td>' + esc(s.pollIntervalSeconds) + 's</td></tr>';
        html += '<tr><td>Last Poll</td><td>' + esc(lastPoll) + '</td></tr>';
        html += '<tr><td>Error Count</td><td>' + esc(s.errorCount) + '</td></tr>';
        html += '<tr><td>Last Error</td><td>' + esc(s.lastError || '—') + '</td></tr>';
        if (s.wallet) {
          html += '<tr><td>Wallet Address</td><td>' + esc(s.wallet.address) + '</td></tr>';
          html += '<tr><td>Native Balance</td><td>' + esc(s.wallet.nativeBalance || 'N/A') + ' POL</td></tr>';
          html += '<tr><td>USDC Balance</td><td>' + esc(s.wallet.usdcBalance || 'N/A') + ' USDC</td></tr>';
        }
        html += '</table>';
        html += '<h2>Recent Events (last 20)</h2>';
        html += '<table><tr><th>Time</th><th>Type</th><th>Detail</th></tr>';
        for (const ev of (s.recentEvents || []).slice(0, 20)) {
          const t = new Date(ev.timestamp).toISOString();
          const cls = (ev.type === 'error' || ev.type === 'trade_failed')
            ? 'err'
            : ev.type === 'trade_mirrored' ? 'ok' : '';
          html += '<tr><td>' + esc(t) + '</td><td class="' + cls + '">' + esc(ev.type) + '</td><td>' + esc(ev.detail) + '</td></tr>';
        }
        if (!s.recentEvents || s.recentEvents.length === 0) {
          html += '<tr><td colspan="3" style="color:#8b949e">No events yet</td></tr>';
        }
        html += '</table>';
        document.getElementById('content').innerHTML = html;
      } catch (e) {
        document.getElementById('content').innerHTML = '<p class="err">Error loading status: ' + e + '</p>';
      }
    }
    load();
  </script>
</body>
</html>`;

export function startStatusServer(config: StatusServerConfig): http.Server {
  const { port, logger } = config;

  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';

    if (url === '/health') {
      const status = botState.getStatus();
      res.writeHead(status.running ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: status.running,
          uptime: status.startedAt != null ? Date.now() - status.startedAt : 0,
        }),
      );
    } else if (url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(botState.getStatus(), null, 2));
    } else if (url === '/' || url === '/dashboard') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML_DASHBOARD);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, () => {
    logger.info(`Status dashboard: http://localhost:${port}/ | JSON: /status | Health: /health`);
  });

  return server;
}
