// 应用编排：three.js 场景生命周期、准星停留调台、换台、筛选、快捷键、主循环
import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { Data, toggleSaved, isSaved, getSaved } from './data.js';
import { setLang, detectLang, t, getLang, genreName } from './i18n.js';
import { store, actions, useStore } from './store.js';
import { usePlayer } from './hooks/usePlayer.js';
import { GlobeScene } from './three/GlobeScene.js';
import { SkyScene } from './three/SkyScene.js';
import { ParticleTransition } from './three/ParticleTransition.js';
import { LabelLayer } from './three/LabelLayer.js';
import { TopBar, Clock, Reticle, Hint, Toast, Tuning } from './components/Chrome.jsx';
import { Dock, Dial } from './components/Dock.jsx';
import { GenreBar, FilterPanel, SearchOverlay, SavedPanel } from './components/Panels.jsx';
import { Intro } from './components/Intro.jsx';

import { LOCK_MS, lockProgress } from './lockTiming.js';

export default function App() {
  const player = usePlayer();
  const hostRef = useRef(null);
  const labelRef = useRef(null);
  const scenes = useRef({});
  const hold = useRef({ since: 0, target: null, lastMove: 0, last: {} });
  const engaged = useRef(false);
  const history = useRef([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [, forceTick] = useState(0);
  const [serverStats, setServerStats] = useState(null);

  // ---------- 启动 ----------
  useEffect(() => {
    let raf = 0;
    let disposed = false;
    (async () => {
      try {
        Data.restoreFilter();
        await Data.load();
        fetch('/api/stats').then(r => r.json()).then(setServerStats).catch(() => {});
      } catch (e) {
        store.set({ loadError: String(e) });
        actions.toast('目录加载失败：请先启动后端 node server/index.js', 6000);
        return;
      }
      if (disposed) return;

      const host = hostRef.current;
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.domElement.className = 'stage-canvas';
      host.appendChild(renderer.domElement);

      const labels = new LabelLayer(labelRef.current);
      const globe = new GlobeScene(renderer, labels);
      const sky = new SkyScene(renderer, labels);
      const transition = new ParticleTransition(renderer);
      scenes.current = { renderer, labels, globe, sky, transition };

      store.set({ loading: false, savedCount: getSaved().length });
      applyFilterMask();
      forceTick(x => x + 1);

      // 续听 / 分享链接
      const q = new URLSearchParams(location.search).get('s');
      let seen = false;
      try { seen = localStorage.getItem('rd.seen') === '1'; } catch (e) { /* ignore */ }
      if (q && Data.byId.has(q)) {
        selectStation(Data.byId.get(q), { play: false, focus: true });
        hideIntro();
      } else {
        if (seen) hideIntro();
        try {
          const last = localStorage.getItem('rd.last');
          if (last && Data.byId.has(last)) selectStation(Data.byId.get(last), { play: false, focus: true });
        } catch (e) { /* ignore */ }
      }

      const onResize = () => {
        transition.cancel();
        const w = host.clientWidth, h = host.clientHeight;
        renderer.setSize(w, h);
        globe.resize(w, h);
        sky.resize(w, h);
      };
      window.addEventListener('resize', onResize);
      onResize();

      const markEngaged = () => { engaged.current = true; hold.current.lastMove = performance.now(); };
      host.addEventListener('pointermove', markEngaged);
      host.addEventListener('pointerdown', markEngaged);
      host.addEventListener('wheel', markEngaged, { passive: true });

      let last = performance.now();
      let frame = 0;
      let previousView = store.get().view;
      let entryPending = true;
      const dbgLoop = { frames: 0, pickCalls: 0, pickHits: 0, errors: [] };
      // 仅开发环境暴露调试钩子（import.meta.env.DEV 由 Vite 注入，生产构建为 false）
      if (import.meta.env.DEV) window.__rd = { player, store, Data, scenes: scenes.current, engaged, hold, dbgLoop };
      const step = now => {
        raf = requestAnimationFrame(step);
        dbgLoop.frames++;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const tt = now / 1000;
        const st = store.get();
        const view = st.view === 'globe' ? globe : sky;
        if (entryPending || previousView !== st.view) {
          const from = previousView === 'globe' ? globe : sky;
          view.update(1, tt);
          transition.begin(from, view, now, entryPending);
          previousView = st.view; entryPending = false;
          hold.current.target = null; hold.current.last = {};
          hold.current.lastMove = now;
          store.set({ reticle: '', holdProgress: 0, hintPx: null });
        }
        host.dataset.transitioning = transition.active ? 'true' : 'false';
        if (transition.active && transition.render(now, dt)) {
          labels.clear();
          const level = player.sampleLevel(dt);
          globe.setAudioLevel(level); sky.setAudioLevel(level);
          hold.current.lastMove = now;
          return;
        }
        host.dataset.transitioning = 'false';
        frame++;
        let pick = null;
        let picked = false;
        if (engaged.current && frame % 5 === 0) {
          picked = true;
          dbgLoop.pickCalls++;
          try { pick = view.pickCenter(); } catch (e) { dbgLoop.errors.push(String(e).slice(0, 120)); }
          if (pick) dbgLoop.pickHits++;
        }
        const h = hold.current;
        if (!picked && engaged.current) pick = h.target;
        if (pick) {
          if (!h.target || h.target.station.id !== pick.station.id) {
            h.target = pick; h.since = now;
          }
          const prog = lockProgress(now, h.since, h.lastMove);
          if (h.last.prog !== prog || h.last.px !== pick.px) {
            h.last = { prog, px: pick.px };
            store.set({
              holdProgress: prog,
              reticle: prog >= 1 ? 'locked' : 'holding',
              hintPx: pick.px
            });
          }
          if (prog >= 1 && (!st.selected || st.selected.id !== pick.station.id)) {
            h.since = now - LOCK_MS;
            selectStation(pick.station, { play: true, focus: false });
          }
        } else if (picked && (h.last.prog !== 0 || h.last.px != null)) {
          // 只在真正探测过且没有命中时重置（探测节流帧不重置）
          h.last = { prog: 0, px: null };
          h.target = null; h.since = 0;
          store.set({ holdProgress: 0, reticle: '', hintPx: null });
        }
        const audioLevel = player.sampleLevel(dt);
        globe.setAudioLevel(audioLevel);
        sky.setAudioLevel(audioLevel);
        globe.tuning = store.get().reticle === 'holding';
        view.update(dt, tt);
        if (view === sky) { host.dataset.centerSelected = 'false'; sky.render(dt); }
        else globe.render(dt);
      };
      raf = requestAnimationFrame(step);
    })();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      scenes.current.transition?.dispose();
    };
  }, []);

  // ---------- 播放器状态 -> store ----------
  useEffect(() => {
    player.onState = (state, station) => {
      store.set({ playerState: state });
      syncSelMeta();
    };
  }, [player]);

  // ---------- 选中台 meta（3D 标签第二行）----------
  const syncSelMeta = useCallback(() => {
    const st = store.get();
    const sel = st.selected;
    const text = sel
      ? `${st.playerState === 'playing' ? (getLang() === 'zh' ? '正在播放' : 'Playing')
        : st.playerState === 'paused' ? (getLang() === 'zh' ? '已暂停' : 'Paused')
        : st.playerState === 'error' ? (getLang() === 'zh' ? '线路不通' : 'Dead')
        : (getLang() === 'zh' ? '已锁定' : 'Locked')} · ${genreName(sel.genre)}${sel.bitrate ? ` · ${sel.bitrate} KBPS` : ''}`
      : '';
    const sc = scenes.current;
    if (sc.globe) sc.globe.setSelMetaText(text);
    if (sc.sky) sc.sky.setSelMetaText(text);
  }, []);

  // ---------- 选台 ----------
  const selectStation = useCallback((st, opts = {}) => {
    if (!st) return;
    const play = opts.play !== false;
    store.set({ selected: st });
    const sc = scenes.current;
    if (sc.globe) sc.globe.setSelected(st, Data.nearby(st));
    if (sc.sky) sc.sky.setSelected(st);
    if (opts.focus !== false) {
      if (store.get().view === 'globe') sc.globe && sc.globe.focusStation(st);
      else sc.sky && sc.sky.focusStation(st, Math.max(sc.sky.distTarget, 2400));
    }
    if (play) {
      history.current.push(st.id);
      if (history.current.length > 50) history.current.shift();
      player.play(st);
    }
    try {
      localStorage.setItem('rd.last', st.id);
      const url = new URL(location.href);
      url.searchParams.set('s', st.id);
      window.history.replaceState(null, '', url);
    } catch (e) { /* ignore */ }
    syncSelMeta();
  }, [player, syncSelMeta]);

  // ---------- 筛选 ----------
  const applyFilterMask = () => {
    const sc = scenes.current;
    if (!sc.globe) return;
    const fn = st => Data.matches(st, Data.filter);
    sc.globe.setVisibleMask(fn);
    sc.sky.setVisibleMask(fn);
  };
  const onFilter = useCallback((patch) => {
    Data.setFilter(patch);
    applyFilterMask();
    store.set({ filterVersion: store.get().filterVersion + 1 });
    const sel = store.get().selected;
    if (sel && !Data.matches(sel, Data.filter)) {
      const list = Data.filtered();
      if (list.length) selectStation(list[0], { play: false, focus: false });
    }
  }, [selectStation]);

  // ---------- 播放控制 ----------
  const togglePlay = useCallback(() => {
    const sel = store.get().selected;
    if (!sel) { startRandom(); return; }
    if (!player.station || player.station.id !== sel.id) player.play(sel);
    else player.toggle();
  }, [player]);
  const startRandom = useCallback(() => {
    const st = Data.random();
    if (!st) return;
    hideIntro();
    selectStation(st, { play: true, focus: true });
  }, [selectStation]);
  const nextStation = useCallback(() => {
    const list = Data.filtered();
    if (!list.length) return;
    let st = Data.random(list);
    let guard = 0;
    const sel = store.get().selected;
    while (sel && st.id === sel.id && guard++ < 8) st = Data.random(list);
    selectStation(st, { play: true, focus: true });
  }, [selectStation]);
  const prevStation = useCallback(() => {
    const h = history.current;
    if (h.length > 1) {
      h.pop();
      const id = h.pop();
      const st = Data.byId.get(id);
      if (st) { selectStation(st, { play: true, focus: true }); return; }
    }
    nextStation();
  }, [selectStation, nextStation]);
  const nudgeStation = useCallback((dir) => {
    const sel = store.get().selected;
    if (!sel) return;
    const sc = scenes.current;
    const view = store.get().view === 'globe' ? sc.globe : sc.sky;
    const st = view && view.nudge(sel, dir);
    if (st) selectStation(st, { play: true, focus: true });
    else actions.toast(t('nearby', { n: Data.nearby(sel).length }));
  }, [selectStation]);
  const stepInto = useCallback(() => {
    const sel = store.get().selected;
    const sc = scenes.current;
    if (!sel || !sc.globe) return;
    if (store.get().view === 'sky') sc.sky.focusStation(sel, 2600);
    else sc.globe.targetDist = 2.0;
    actions.toast(t('enter'));
  }, []);
  const toggleSave = useCallback(() => {
    const sel = store.get().selected;
    if (!sel) return;
    const on = toggleSaved(sel.id);
    store.set({ savedCount: getSaved().length });
    actions.toast(on ? t('saved-ok') : t('unsave'));
  }, []);
  const share = useCallback(() => {
    const sel = store.get().selected;
    if (!sel) return;
    const url = new URL(location.href);
    url.searchParams.set('s', sel.id);
    const link = url.toString();
    const done = ok => actions.toast(ok ? t('share-ok') : t('share-fail'));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(() => done(true), () => done(false));
    } else done(false);
  }, []);
  const toggleMute = useCallback(() => {
    const m = player.toggleMute();
    store.set({ muted: m });
  }, [player]);
  const setVolume = useCallback((v) => {
    player.setVolume(v);
    store.set({ muted: false });
  }, [player]);
  const setView = useCallback((v) => {
    if (store.get().view === v) return;
    store.set({ view: v });
    const sc = scenes.current;
    const sel = store.get().selected;
    if (v === 'sky') sc.sky && sc.sky.focusStation(sel, 5600);
    else sc.globe && sc.globe.focusStation(sel);
  }, []);
  const toggleLang = useCallback(() => {
    const next = getLang() === 'zh' ? 'en' : 'zh';
    setLang(next);
    try { localStorage.setItem('rd.lang', next); } catch (e) { /* ignore */ }
    forceTick(x => x + 1);
    syncSelMeta();
  }, [syncSelMeta]);
  const hideIntro = useCallback(() => {
    store.set({ introVisible: false });
    document.body.classList.remove('intro-on');
    try { localStorage.setItem('rd.seen', '1'); } catch (e) { /* ignore */ }
  }, []);

  // ---------- 键盘 ----------
  useEffect(() => {
    const onKey = e => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        if (e.key === 'Escape') { actions.panel('search', false); e.target.blur(); }
        return;
      }
      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); nextStation(); break;
        case 'ArrowLeft': e.preventDefault(); prevStation(); break;
        case 'ArrowUp': e.preventDefault(); nudgeStation(1); break;
        case 'ArrowDown': e.preventDefault(); nudgeStation(-1); break;
        case 'g': case 'G': setView(store.get().view === 'globe' ? 'sky' : 'globe'); break;
        case '/': e.preventDefault(); actions.panel('search', true); break;
        case 'f': case 'F': toggleSave(); break;
        case 'l': case 'L': toggleSave(); if (store.get().selected) (store.get().view === 'globe' ? scenes.current.globe : scenes.current.sky).focusStation(store.get().selected); break;
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'm': case 'M': toggleMute(); break;
        case 'Enter': stepInto(); break;
        case 'Escape':
          actions.panel('search', false);
          actions.panel('filters', false);
          actions.panel('saved', false);
          break;
        default: break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [nextStation, prevStation, nudgeStation, setView, toggleSave, togglePlay, toggleMute, stepInto]);

  // ---------- 渲染 ----------
  const st = useStore();
  const stats = { total: Data.total, countries: Data.countries.length };
  const filteredCount = Data.filtered().length;

  return (
    <>
      <div className="stage" ref={hostRef} />
      <div className="label-layer" ref={labelRef} />
      <TopBar onHome={() => { setView('globe'); if (scenes.current.globe) scenes.current.globe.targetDist = 4.0; }} stats={st.loading ? null : stats} onView={setView}
        onSearch={() => actions.panel('search', true)}
        onSaved={() => { actions.panel('saved', !st.panels.saved); store.set({ savedCount: getSaved().length }); }}
        onFilters={() => actions.panel('filters', !st.panels.filters)}
        onLang={toggleLang} />
      <Clock station={st.selected} />
      <Reticle />
      <Tuning />
      <Hint />
      <Dock onStart={startRandom} onEnter={stepInto} onPlay={togglePlay} onPrev={prevStation} onNext={nextStation}
        onSave={toggleSave} onShare={share} onMute={toggleMute} onVolume={setVolume}
        onTag={tg => { setSearchQuery(tg); actions.panel('search', true); }} />
      <Dial onPick={x => selectStation(x, { play: false, focus: false })} />
      <GenreBar filteredCount={filteredCount} onFilter={onFilter} />
      <FilterPanel stats={serverStats} onFilter={onFilter} />
      <SearchOverlay query={searchQuery} setQuery={setSearchQuery}
        onPick={x => { actions.panel('search', false); selectStation(x, { play: true }); }}
        onClose={() => actions.panel('search', false)} />
      <SavedPanel onPick={x => { actions.panel('saved', false); selectStation(x, { play: true }); }}
        onClose={() => actions.panel('saved', false)} />
      <Intro stats={st.loading ? null : stats} onStart={startRandom} onExplore={() => { hideIntro(); setView('sky'); }} />
      <Toast />
    </>
  );
}
