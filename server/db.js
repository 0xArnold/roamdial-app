// SQLite 数据层：schema、规范化写入、bootstrap 列式载荷、统计查询。
import Database from 'better-sqlite3';
import { CENTROIDS, genreOf, hash } from './geo.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.RD_DB || path.join(__dirname, 'roamdial.db');

let db;

export function getDb() {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT,
      country TEXT,
      cc TEXT,
      state TEXT,
      language TEXT,
      tags TEXT,
      bitrate INTEGER DEFAULT 0,
      votes INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      favicon TEXT,
      homepage TEXT,
      codec TEXT,
      lat REAL,
      lng REAL,
      exact INTEGER DEFAULT 0,
      genre TEXT,
      updated_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_genre ON stations(genre);
    CREATE INDEX IF NOT EXISTS idx_cc ON stations(cc);
    CREATE INDEX IF NOT EXISTS idx_lang ON stations(language);
    CREATE TABLE IF NOT EXISTS meta (
      k TEXT PRIMARY KEY,
      v TEXT
    );
  `);
  return db;
}

// 原始记录 -> 规范化行（无精确坐标的用国家质心；几何抖动由前端做，保证确定性且可调）
export function normalize(s) {
  const cc = (s.countrycode || '').toUpperCase();
  let lat = s.geo_lat, lng = s.geo_long, exact = 0;
  if (Number.isFinite(lat) && Number.isFinite(lng)) exact = 1;
  else if (cc && CENTROIDS[cc]) { [lng, lat] = CENTROIDS[cc]; }
  else { lat = null; lng = null; }
  return {
    id: s.stationuuid,
    name: (s.name || '').trim() || '—',
    url: s.url_resolved || s.url,
    country: s.country || '',
    cc,
    state: s.state || '',
    language: (s.language || '').split(',')[0].trim(),
    tags: s.tags || '',
    bitrate: s.bitrate || 0,
    votes: s.votes || 0,
    clicks: s.clickcount || 0,
    favicon: s.favicon || '',
    homepage: s.homepage || '',
    codec: s.codec || '',
    lat, lng, exact,
    genre: genreOf(s.tags),
    updated_at: Date.now()
  };
}

const UPSERT = getDb().prepare(`
  INSERT INTO stations (id,name,url,country,cc,state,language,tags,bitrate,votes,clicks,
    favicon,homepage,codec,lat,lng,exact,genre,updated_at)
  VALUES (@id,@name,@url,@country,@cc,@state,@language,@tags,@bitrate,@votes,@clicks,
    @favicon,@homepage,@codec,@lat,@lng,@exact,@genre,@updated_at)
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name, url=excluded.url, country=excluded.country, cc=excluded.cc,
    state=excluded.state, language=excluded.language, tags=excluded.tags,
    bitrate=excluded.bitrate, votes=excluded.votes, clicks=excluded.clicks,
    favicon=excluded.favicon, homepage=excluded.homepage, codec=excluded.codec,
    lat=excluded.lat, lng=excluded.lng, exact=excluded.exact, genre=excluded.genre,
    updated_at=excluded.updated_at
`);

export function upsertMany(rows) {
  const d = getDb();
  const tx = d.transaction(list => {
    for (const r of list) UPSERT.run(r);
  });
  tx(rows);
  return rows.length;
}

export function count() {
  return getDb().prepare('SELECT COUNT(*) AS n FROM stations').get().n;
}

export function setMeta(k, v) {
  getDb().prepare('INSERT INTO meta (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v')
    .run(k, String(v));
}
export function getMeta(k) {
  const r = getDb().prepare('SELECT v FROM meta WHERE k = ?').get(k);
  return r ? r.v : null;
}

// ---- bootstrap：一次拿全量（列式紧凑载荷，星图/地球粒子直接建 buffer）----
export function bootstrap() {
  const d = getDb();
  const rows = d.prepare(
    'SELECT id,name,url,country,cc,state,language,tags,bitrate,votes,clicks,favicon,homepage,codec,lat,lng,exact,genre FROM stations'
  ).all();
  const n = rows.length;
  const out = {
    n,
    ids: new Array(n), names: new Array(n), urls: new Array(n),
    countries: new Array(n), ccs: new Array(n), states: new Array(n),
    languages: new Array(n), tags: new Array(n), bitrates: new Int32Array(n),
    votes: new Int32Array(n), favicons: new Array(n), homepages: new Array(n),
    codecs: new Array(n), genres: new Array(n),
    lngs: new Float32Array(n), lats: new Float32Array(n), exacts: new Uint8Array(n)
  };
  for (let i = 0; i < n; i++) {
    const r = rows[i];
    out.ids[i] = r.id; out.names[i] = r.name; out.urls[i] = r.url;
    out.countries[i] = r.country; out.ccs[i] = r.cc; out.states[i] = r.state;
    out.languages[i] = r.language; out.tags[i] = r.tags;
    out.bitrates[i] = r.bitrate; out.votes[i] = r.votes;
    out.favicons[i] = r.favicon; out.homepages[i] = r.homepage; out.codecs[i] = r.codec;
    out.genres[i] = r.genre;
    out.lngs[i] = r.lng == null ? 0 : r.lng;
    out.lats[i] = r.lat == null ? 0 : r.lat;
    out.exacts[i] = r.exact;
  }
  return out;
}

export function stats() {
  const d = getDb();
  const total = count();
  const countries = d.prepare("SELECT cc AS k, COUNT(*) AS n FROM stations WHERE cc != '' GROUP BY cc ORDER BY n DESC").all();
  const genres = d.prepare('SELECT genre AS k, COUNT(*) AS n FROM stations GROUP BY genre ORDER BY n DESC').all();
  const langs = d.prepare('SELECT language AS k, COUNT(*) AS n FROM stations GROUP BY language ORDER BY n DESC').all();
  const geo = d.prepare('SELECT COUNT(*) AS n FROM stations WHERE lat IS NOT NULL').get().n;
  return { total, countries, genres, langs, geo, updatedAt: getMeta('last_ingest') };
}

export function stationById(id) {
  return getDb().prepare('SELECT * FROM stations WHERE id = ?').get(id) || null;
}
