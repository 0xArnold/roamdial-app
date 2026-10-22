// 数据层：bootstrap 载荷 -> 电台数组 + 星图布局 + 球面点阵 + 筛选索引。
// 重计算全部在客户端完成（2 万台 <10ms），SQLite 只负责存储与分发。
import cityAnchors from './assets/city-anchors.json';
import { US_STATE_FULL_TO_ABBR } from './geo.js';
import { t } from './i18n.js';

// 流派色相（对齐原站星云截图）
const PALETTE = {
  mixed: [0.58, 0.78, 0.87], pop: [1.0, 0.53, 0.45], news: [0.30, 0.53, 1.0],
  rock: [1.0, 0.42, 0.14], electronic: [0.12, 0.9, 0.79], world: [1.0, 0.72, 0.10],
  religious: [0.83, 0.73, 0.39], classical: [1.0, 0.91, 0.64], jazz: [1.0, 0.64, 0.18],
  country: [0.72, 0.85, 0.45], hiphop: [0.75, 0.55, 0.92], oldies: [0.9, 0.62, 0.42],
  latin: [0.98, 0.48, 0.5]
};
export const genreColor = g => PALETTE[g] || PALETTE.mixed;

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// 无坐标台的示意位置：分散至本国城市锚点，绝不写回真实经纬度。
function jitterGeo(id, lng, lat, cc, state) {
  const h = hash(id);
  const cities = cityAnchors[cc];
  if (cities?.length) {
    const candidates = matchCities(cities, state) || cities;
    const city = candidates[h % candidates.length];
    lng = city[1]; lat = city[2];
  }
  const ang = (h % 1024) / 1024 * Math.PI * 2;
  const rad = Math.sqrt(((h >>> 10) % 1024) / 1024);
  const spread = rad * (cities?.length ? 0.16 : 0.06);
  const latRad = lat * Math.PI / 180;
  let l = lng + Math.cos(ang) * spread / Math.max(0.35, Math.cos(latRad));
  let a = lat + Math.sin(ang) * spread * 0.62;
  return [Math.max(-179, Math.min(179, l)), Math.max(-84, Math.min(84, a))];
}

// 按 state（州/省名）从城市锚点里筛出匹配的城市。
// 城市名形如 "Los Angeles CA"（城市 + 州缩写）或 "São Paulo SP"。
// 匹配策略：州全名→缩写（仅美国），或用州名匹配城市名前缀。
function matchCities(cities, state) {
  const st = (state || '').trim();
  if (!st) return null;
  const stLower = st.toLowerCase();
  // 美国：州全名 → 缩写
  const abbr = US_STATE_FULL_TO_ABBR[st] || null;
  const out = cities.filter(c => {
    const name = c[0];
    // 带州缩写后缀："Los Angeles CA" -> "CA"
    const m = name.match(/\s([A-Z]{2})$/);
    if (m) {
      if (abbr && m[1] === abbr) return true;
      if (m[1].toLowerCase() === stLower) return true;
    }
    // 州名匹配城市名前缀（如 "São Paulo" 匹配 "São Paulo SP"）
    const cityPart = name.replace(/\s[A-Z]{2}$/, '').toLowerCase();
    return cityPart === stLower || cityPart.startsWith(stLower);
  });
  return out.length ? out : null;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const Data = {
  stations: [],
  byId: new Map(),
  genres: [], countries: [], languages: [],
  total: 0,
  filter: { genre: 'all', bitrate: 0, country: 'all', language: 'all' },
  // 布局产物
  sky: null,     // { x, y, size, phase, color(Float32Array 3n), clusterOf[] }
  globe: null,   // { pos(Float32Array 3n), size, color, stIdx[] }
  skyClusters: [],
  ready: false,

  async load() {
    const r = await fetch('/api/bootstrap');
    if (!r.ok) throw new Error('bootstrap failed');
    const b = await r.json();
    this.ingest(b);
  },

  ingest(b) {
    const n = b.n;
    const stations = new Array(n);
    for (let i = 0; i < n; i++) {
      let elng = b.lngs[i], elat = b.lats[i];
      const exact = !!b.exacts[i];
      if (!exact && b.ccs[i]) [elng, elat] = jitterGeo(b.ids[i], elng, elat, b.ccs[i], b.states[i]);
      if (!exact && !b.ccs[i]) elng = elat = NaN;
      const s = {
        id: b.ids[i], name: b.names[i], url: b.urls[i],
        country: b.countries[i], cc: b.ccs[i], state: b.states[i],
        lang: b.languages[i] || '',
        tags: (b.tags[i] || '').split(',').map(x => x.trim()).filter(Boolean),
        genre: b.genres[i], bitrate: b.bitrates[i], votes: b.votes[i],
        favicon: b.favicons[i], homepage: b.homepages[i], codec: b.codecs[i],
        lng: exact ? b.lngs[i] : null,
        lat: exact ? b.lats[i] : null,
        elng, elat, exact
      };
      stations[i] = s;
    }
    this.stations = stations;
    this.byId = new Map(stations.map(s => [s.id, s]));
    this.total = n;
  this.buildIndices();
  this.buildNearbyIndex();
  this.buildSkyLayout();
  this.buildGlobePoints();
    this._filteredDirty = true;
    this.ready = true;
  },

  buildIndices() {
    const g = new Map(), c = new Map(), l = new Map();
    for (const s of this.stations) {
      g.set(s.genre, (g.get(s.genre) || 0) + 1);
      if (s.cc) c.set(s.cc, (c.get(s.cc) || 0) + 1);
      l.set(s.lang, (l.get(s.lang) || 0) + 1);
    }
    this.genres = [...g.entries()].map(([key, count]) => ({ key, count })).sort((a, b2) => b2.count - a.count);
    this.countries = [...c.entries()].map(([cc, count]) => ({ cc, count })).sort((a, b2) => b2.count - a.count);
    this.languages = [...l.entries()].map(([name, count]) => ({ name, count })).sort((a, b2) => b2.count - a.count);
  },

  // ---- 星云布局：流派按黄金角螺旋成团，团内螺旋散布 ----
  buildSkyLayout() {
    const sts = this.stations;
    const n = sts.length;
    const counts = new Map();
    for (const s of sts) counts.set(s.genre, (counts.get(s.genre) || 0) + 1);
    const order = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const m = order.length;
    const maxCount = order[0][1];
    const R = 2750;
    this.skyClusters = [];
    const byGenre = new Map();
    for (const s of sts) {
      if (!byGenre.has(s.genre)) byGenre.set(s.genre, []);
      byGenre.get(s.genre).push(s);
    }
    order.forEach(([key, count], i) => {
      const r = R * Math.sqrt((i + 0.55) / m);
      const th = i * 2.399963;
      const cr = 260 + 620 * Math.sqrt(count / maxCount);
      const h = hash(key);
      this.skyClusters.push({
        key, count,
        x: r * Math.cos(th) * 1.5, y: r * Math.sin(th) * 0.82,
        cr,
        squash: 0.62 + (h % 100) / 100 * 0.55,     // 椭圆度
        rot: ((h >>> 8) % 100) / 100 * Math.PI,     // 椭圆朝向
        arms: 2 + (h % 3),
        color: genreColor(key)
      });
    });
    const x = new Float32Array(n), y = new Float32Array(n);
    const size = new Float32Array(n), phase = new Float32Array(n);
    const color = new Float32Array(n * 3);
    const clusterOf = new Int32Array(n);
    const indexOf = new Map(sts.map((s, i) => [s.id, i]));
    for (let ci = 0; ci < this.skyClusters.length; ci++) {
      const cl = this.skyClusters[ci];
      const list = byGenre.get(cl.key) || [];
      const rng = mulberry32(hash(cl.key));
      const cosR = Math.cos(cl.rot), sinR = Math.sin(cl.rot);
      for (let k = 0; k < list.length; k++) {
        const s = list[k];
        const i = indexOf.get(s.id);
        if (i == null) continue;
        const r2 = mulberry32(hash(s.id));
        // 半径分布：30% 聚在核心，其余铺开
        const u = r2();
        const rr = cl.cr * Math.min(1.8, Math.sqrt(-2 * Math.log(Math.max(0.0001, 1 - u))) * 0.52);
        let th2 = r2() * TAU + (k % cl.arms) * (TAU / cl.arms) + rr * 0.0042;
        let px = rr * Math.cos(th2), py = rr * Math.sin(th2);
        // 椭圆 + 朝向
        const ex = px * cosR - py * cl.squash * sinR;
        const ey = px * sinR + py * cl.squash * cosR;
        x[i] = cl.x + ex + (r2() - 0.5) * 42;
        y[i] = cl.y + ey + (r2() - 0.5) * 42;
        size[i] = 0.75 + Math.pow(r2(), 2) * 1.8;
        phase[i] = r2() * TAU;
        const c = cl.color;
        color[i * 3] = c[0]; color[i * 3 + 1] = c[1]; color[i * 3 + 2] = c[2];
        clusterOf[i] = ci;
      }
    }
    this.sky = { x, y, size, phase, color, clusterOf };
  },

  // ---- 球面电台：每台一点，国家级近似位置降低亮度 ----
  buildGlobePoints() {
    const sts = this.stations;
    const pos = [], size = [], color = [], stIdx = [];
    for (let i = 0; i < sts.length; i++) {
      const s = sts[i];
      if (!Number.isFinite(s.elng) || !Number.isFinite(s.elat)) continue;
      const emit = (lng2, lat2, sz) => {
        const la = lat2 * D2R, lo = lng2 * D2R;
        pos.push(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
        size.push(sz); color.push(0.92, 0.88, 0.75); stIdx.push(i);
      };
      if (s.exact) {
        emit(s.elng, s.elat, 2.2);
      } else {
        emit(s.elng, s.elat, 0.85);
      }
    }
    this.globe = {
      pos: new Float32Array(pos), size: new Float32Array(size),
      color: new Float32Array(color), stIdx: new Int32Array(stIdx)
    };
  },

  // ---- 同城索引：cc -> state -> [stations]（nudge 用，避免每次全表 scan）----
  buildNearbyIndex() {
    const byCc = new Map();
    for (const s of this.stations) {
      if (!s.cc) continue;
      if (!byCc.has(s.cc)) byCc.set(s.cc, new Map());
      const byState = byCc.get(s.cc);
      const key = s.state || '';
      if (!byState.has(key)) byState.set(key, []);
      byState.get(key).push(s);
    }
    this._nearbyByCc = byCc;
  },

  // ---- 筛选 ----
  matches(s, f) {
    if (f.genre !== 'all' && s.genre !== f.genre) return false;
    if (f.bitrate === 320 ? s.bitrate !== 320 : (f.bitrate && s.bitrate < f.bitrate)) return false;
    if (f.country !== 'all' && s.cc !== f.country) return false;
    if (f.language !== 'all' && s.lang !== f.language) return false;
    return true;
  },
  _filteredCache: null,
  _filteredDirty: true,
  filtered() {
    if (this._filteredDirty || !this._filteredCache) {
      const f = this.filter;
      this._filteredCache = this.stations.filter(s => this.matches(s, f));
      this._filteredDirty = false;
    }
    return this._filteredCache;
  },
  setFilter(patch) {
    this.filter = { ...this.filter, ...patch };
    this._filteredDirty = true;
    try { localStorage.setItem('rd.filter', JSON.stringify(this.filter)); } catch (e) { /* ignore */ }
  },
  restoreFilter() {
    try {
      const f = JSON.parse(localStorage.getItem('rd.filter') || 'null');
      if (f) this.filter = { ...this.filter, ...f };
    } catch (e) { /* ignore */ }
  },

  random(pool) {
    const arr = pool && pool.length ? pool : this.filtered();
    return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
  },

  search(q, limit = 14) {
    q = (q || '').trim().toLowerCase();
    if (!q) return [];
    const out = [];
    for (const s of this.stations) {
      const name = s.name.toLowerCase();
      let score = 0;
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 60;
      else if (name.includes(q)) score = 30;
      if (!score) {
        if (s.state && s.state.toLowerCase().includes(q)) score = 20;
        else if (s.country && s.country.toLowerCase().includes(q)) score = 12;
        else if (s.lang && s.lang.toLowerCase().includes(q)) score = 8;
        else if (s.tags.some(tg => tg.includes(q))) score = 6;
      }
      if (score) out.push({ s, score: score + Math.min(20, s.votes / 50000) });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, limit).map(x => x.s);
  },

  nearby(s) {
    const byState = this._nearbyByCc && this._nearbyByCc.get(s.cc);
    let near = byState && byState.get(s.state || '');
    if (!near || near.length < 2) {
      // 同州不足：退回同国家（含无州标注的台）
      near = [];
      if (byState) for (const list of byState.values()) for (const x of list) if (x.id !== s.id) near.push(x);
    } else {
      near = near.filter(x => x.id !== s.id);
    }
    return near.slice(0, 14);
  },

  // nudge 专用：同州优先，否则同国；返回当前台在序列中的下一/上一台
  nudgeNeighbor(s, dir) {
    const byState = this._nearbyByCc && this._nearbyByCc.get(s.cc);
    if (!byState) return null;
    let list = byState.get(s.state || '');
    if (!list || list.length < 2) {
      list = [];
      for (const l of byState.values()) for (const x of l) list.push(x);
      if (list.length < 2) return null;
    }
    const i = list.findIndex(x => x.id === s.id);
    if (i < 0) return null;
    return list[(i + dir + list.length) % list.length];
  }
};

// 收藏
export function getSaved() {
  try { return JSON.parse(localStorage.getItem('rd.saved') || '[]'); } catch (e) { return []; }
}
export function toggleSaved(id) {
  const list = getSaved();
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.unshift(id);
  try { localStorage.setItem('rd.saved', JSON.stringify(list.slice(0, 500))); } catch (e) { /* ignore */ }
  return i < 0;
}
export const isSaved = id => getSaved().includes(id);
