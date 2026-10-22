// 从 Radio Browser 摄取电台目录 -> SQLite。
// 两个切片：票数榜（主体）+ 点击热度榜（增量，避免与种子重复）。
// 用法：node ingest.js [votesTarget] [trendTarget]
import { normalize, upsertMany, count, setMeta } from './db.js';

const SERVERS = [
  'https://de1.api.radio-browser.info/json',
  'https://de2.api.radio-browser.info/json'
];
const PAGE = 400;
const VOTES_TARGET = parseInt(process.argv[2] || '20000', 10);
const TREND_TARGET = parseInt(process.argv[3] || '5000', 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(path, tries = 5) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    const base = SERVERS[i % SERVERS.length];
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 25000);
      const r = await fetch(base + path, { headers: { Accept: 'application/json' }, signal: ac.signal });
      clearTimeout(t);
      if (r.ok) return await r.json();
      last = new Error('HTTP ' + r.status);
      if (r.status === 429) { await sleep(2500 * (i + 1)); continue; }
    } catch (e) { last = e; }
    await sleep(700 * (i + 1));
  }
  throw last;
}

async function slice(order, target) {
  let offset = 0, pages = 0, added = 0;
  while (offset < target) {
    let page = null;
    try {
      page = await api(`/stations/search?limit=${PAGE}&offset=${offset}&hidebroken=true&order=${order}&reverse=true`);
    } catch (e) {
      console.warn(`[${order}] page ${offset} failed:`, e.message || e);
      break;
    }
    if (!page || !page.length) break;
    const rows = page.filter(s => s.stationuuid).map(normalize);
    upsertMany(rows);
    added += rows.length;
    pages++;
    offset += PAGE;
    process.stdout.write(`\r[${order}] ${pages} pages, ${added} fetched, db=${count()}   `);
    if (page.length < PAGE) break;
    await sleep(400);
  }
  console.log('');
  return pages;
}

console.log(`ingest start: votes<=${VOTES_TARGET}, trend<=${TREND_TARGET}`);
const t0 = Date.now();
await slice('votes', VOTES_TARGET);
await slice('clicktrend', TREND_TARGET);
setMeta('last_ingest', new Date().toISOString());
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s — db now has ${count()} stations`);
