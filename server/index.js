// RoamDial 复刻 · 后端：Express + SQLite
// - GET  /api/bootstrap   全量列式载荷（星图/地球粒子直接建 GPU buffer）
// - GET  /api/stats       流派/国家/语言计数
// - GET  /api/station/:id 单台详情
// - POST /api/click/:id   代理上报 Radio Browser（免 CORS、隐藏 UA）
// - 每周自动刷新目录（同原站节奏）
import express from 'express';
import { gzipSync } from 'node:zlib';
import { relayStream } from './stream.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { bootstrap, stats, stationById, getDb, normalize, upsertMany, setMeta, count } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const WEEK = 7 * 24 * 3600 * 1000;

// bootstrap 载荷 ~7MB，预压缩 + 协商缓存，首屏提速
let bootGz = null;
let bootJson = '';
let bootEtag = null;
function getBootstrapGz() {
  const data = bootstrap();
  const json = JSON.stringify(data);
  // FNV-1a 32 位 hash 作 etag（避免每请求重复 JSON.stringify 对比）
  let h = 2166136261;
  for (let i = 0; i < json.length; i++) { h ^= json.charCodeAt(i); h = Math.imul(h, 16777619); }
  const etag = '"' + (h >>> 0).toString(36) + '"';
  if (etag !== bootEtag) {
    bootGz = gzipSync(Buffer.from(json), { level: 6 });
    bootJson = json;
    bootEtag = etag;
  }
  return { gz: bootGz, json: bootJson, etag: bootEtag };
}

app.get('/api/bootstrap', (req, res) => {
  const { gz, json, etag } = getBootstrapGz();
  res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300',
    'ETag': etag,
    'Vary': 'Accept-Encoding'
  });
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  if (/gzip/.test(req.headers['accept-encoding'] || '')) {
    res.set('Content-Encoding', 'gzip');
    res.send(gz);
  } else {
    res.send(json);
  }
});

app.get('/api/stats', (req, res) => {
  res.json(stats());
});

app.get('/api/station/:id', (req, res) => {
  const s = stationById(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  res.json(s);
});

app.get('/api/stream/:id', (req, res) => {
  const station = stationById(req.params.id);
  if (!station) return res.status(404).json({ error: 'not found' });
  relayStream(station.url, req, res);
});

// HLS 段/子播放列表代理：URL 由服务端在重写播放列表时生成（base64url），
// 仅接受公网 http(s) 地址（publicTarget 校验），用于 HTTPS 页面下的同源加载。
app.get('/api/stream-seg', (req, res) => {
  let target;
  try {
    target = Buffer.from(String(req.query.u || ''), 'base64url').toString('utf8');
    new URL(target);
  } catch {
    return res.status(400).json({ error: 'bad segment url' });
  }
  relayStream(target, req, res);
});

app.post('/api/click/:id', async (req, res) => {
  const s = stationById(req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  // 转发给 Radio Browser（best-effort，失败不影响播放）
  for (const base of ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info']) {
    try {
      await fetch(`${base}/json/url/${s.id}`, {
        method: 'POST',
        headers: { 'User-Agent': 'RoamDialClone/2.0' }
      });
      break;
    } catch (e) { /* try next */ }
  }
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, stations: count() });
});

// 生产模式：服务构建产物（非 API 请求都回 index.html）
const dist = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(dist));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(dist, 'index.html'), err => {
    if (err) res.status(503).send('web/dist 未构建：先 cd web && npm run build');
  });
});

// 每周刷新（votes top 4000 + trend 2000，轻量增量）
async function weeklyRefresh() {
  try {
    console.log('[refresh] weekly directory refresh…');
    const SERVERS = ['https://de1.api.radio-browser.info/json', 'https://de2.api.radio-browser.info/json'];
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (const order of ['votes', 'clicktrend']) {
      let offset = 0;
      const target = order === 'votes' ? 4000 : 2000;
      while (offset < target) {
        let page = null;
        for (let i = 0; i < 3 && !page; i++) {
          try {
            const r = await fetch(`${SERVERS[i % 2]}/stations/search?limit=400&offset=${offset}&hidebroken=true&order=${order}&reverse=true`, { signal: AbortSignal.timeout(20000) });
            if (r.ok) page = await r.json();
          } catch (e) { /* retry */ }
          if (!page) await sleep(1500);
        }
        if (!page || !page.length) break;
        upsertMany(page.filter(s => s.stationuuid).map(normalize));
        offset += 400;
        await sleep(400);
      }
    }
    setMeta('last_ingest', new Date().toISOString());
    console.log(`[refresh] done — ${count()} stations`);
  } catch (e) {
    console.warn('[refresh] failed:', e.message || e);
  }
}
setInterval(weeklyRefresh, WEEK).unref();

const PORT = parseInt(process.env.PORT || '8620', 10);
app.listen(PORT, () => {
  console.log(`RoamDial server on http://localhost:${PORT} (${count()} stations)`);
});
