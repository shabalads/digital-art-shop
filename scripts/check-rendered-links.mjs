// scripts/check-rendered-links.mjs
//
// Renders pages in headless Chrome twice, once normally and once with /api/* blocked
// (robots.txt says "Disallow: /api", so Google's renderer cannot call it), and counts
// the product links in the raw HTML and in each rendered DOM. A page whose list
// depends on a client-side /api call shows it here: its blocked count drops, or
// placeholder products appear.
//
//   node scripts/check-rendered-links.mjs https://www.itemssyprints.com / /shop /bestsellers
//
// Needs Node 22+ (global WebSocket/fetch) and Chrome. Set CHROME=/path/to/chrome if it
// is not in the macOS default location. Reads pages only; changes nothing.

import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [BASE, ...PATHS] = process.argv.slice(2);
if (!BASE || PATHS.length === 0) {
  console.error('usage: node scripts/check-rendered-links.mjs <base-url> <path> [<path> ...]');
  process.exit(2);
}
const PORT = 9300 + Math.floor(Math.random() * 400);
const PROFILE = mkdtempSync(join(tmpdir(), 'chrome-rendered-links-'));
const SETTLE_MS = 8000; // hydration + client fetches + state updates

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
      if (r.ok) return await r.json();
    } catch { /* chrome still starting */ }
    await sleep(250);
  }
  throw new Error('Chrome did not start');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const handlers = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    else handlers.forEach((h) => h(msg));
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    const t = setTimeout(() => rej(new Error(`DevTools timeout: ${method}`)), 20000);
    pending.set(i, (m) => { clearTimeout(t); res(m); });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  return new Promise((res) => { ws.onopen = () => res({ send, on: (h) => handlers.push(h), close: () => ws.close() }); });
}

// Product links by kind: real products have UUID ids; /product/1../product/10 and
// /product/b1.. were the old placeholder products.
function classify(html) {
  const hrefs = [...html.matchAll(/href="\/product\/([^"#?]+)"/g)].map((m) => m[1]);
  const real = new Set(hrefs.filter((h) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(h)));
  const placeholders = [...new Set(hrefs.filter((h) => /^(\d{1,2}|b\d{1,2})$/.test(h)))];
  return { real: real.size, placeholders };
}

async function render(path, blockApi) {
  const target = await newTarget();
  const cdp = await connect(target.webSocketDebuggerUrl);
  const urls = new Map();
  let apiFailed = 0, apiOk = 0;
  cdp.on((m) => {
    if (m.method === 'Network.requestWillBeSent') urls.set(m.params.requestId, m.params.request.url);
    const isApi = (id) => /\/api\//.test(urls.get(id) || '');
    if (m.method === 'Network.loadingFailed' && isApi(m.params.requestId)) apiFailed++;
    if (m.method === 'Network.loadingFinished' && isApi(m.params.requestId)) apiOk++;
  });
  try {
    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    if (blockApi) await cdp.send('Network.setBlockedURLs', { urls: ['*/api/*'] });
    await cdp.send('Page.navigate', { url: BASE + path });
    await sleep(SETTLE_MS);
    const html = (await cdp.send('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true })).result.result.value || '';
    const text = (await cdp.send('Runtime.evaluate', { expression: "(document.querySelector('main')||document.body).innerText", returnByValue: true })).result.result.value || '';
    return { ...classify(html), apiFailed, apiOk, emptyState: /No prints found/.test(text) };
  } finally {
    cdp.close();
    await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`).catch(() => {});
  }
}

const fmt = (x) => `${x.real} real${x.placeholders.length ? ` + ${x.placeholders.length} placeholder (${x.placeholders.join(',')})` : ''}`;

try {
  console.log(`Base: ${BASE}\n`);
  console.log('page'.padEnd(38), 'RAW html'.padEnd(10), 'RENDERED'.padEnd(10), 'RENDERED with /api blocked (what Google sees)');
  for (const path of PATHS) {
    try {
      const raw = classify(execFileSync('curl', ['-s', '-L', '--max-time', '60', '-A', 'rendered-links-check/1.0', BASE + path], { maxBuffer: 50 * 1024 * 1024 }).toString());
      const normal = await render(path, false);
      const blocked = await render(path, true);
      console.log(path.padEnd(38), String(raw.real).padEnd(10), String(normal.real).padEnd(10), fmt(blocked) + (blocked.emptyState ? '   ** "No prints found" shown **' : '') + `   [/api calls: ${normal.apiOk} ok normally, ${blocked.apiFailed} blocked]`);
    } catch (e) {
      console.log(path.padEnd(38), 'FAILED:', String(e.message).slice(0, 90));
    }
  }
} finally {
  chrome.kill();
}
