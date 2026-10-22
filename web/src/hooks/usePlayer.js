import { useRef } from 'react';
import { rmsLevel, smoothLevel } from '../audioEnvelope.js';
import { playbackSource } from '../streamSource.js';

export function usePlayer() {
  const ref = useRef(null);
  if (!ref.current) ref.current = createPlayer();
  return ref.current;
}

function createPlayer() {
  let hls = null;
  let audio = null, context = null, analyser = null, source = null, samples = null;
  // HTTPS 页面（FN Connect 等公网访问）下，浏览器拦截 http:// 子资源（混合内容），
  // 所有播放都必须走同源 /api 中继；直连回退此时必然失败，只会白白多等一个超时。
  const httpsPage = location.protocol === 'https:';
  const p = {
    audio: null, station: null, state: 'idle', attempts: 0,
    volume: 0.8, muted: false, onState: null, _timer: null,
    level: 0, analysis: 'idle', mode: 'relay'
  };
  try {
    const value = Number(localStorage.getItem('rd.volume') ?? 0.8);
    if (Number.isFinite(value)) p.volume = Math.max(0, Math.min(1, value));
    p.muted = localStorage.getItem('rd.muted') === '1';
  } catch { /* Storage may be disabled. */ }

  function set(state) { p.state = state; p.onState?.(state, p.station); }
  function detach() {
    clearTimeout(p._timer);
    source?.disconnect(); source = null;
    if (audio) {
      audio.onplaying = audio.onpause = audio.onerror = audio.onended = null;
      audio.pause(); audio.removeAttribute('src'); audio.load();
    }
    hls?.destroy(); hls = null;
    audio = null; p.audio = null; p.level = 0;
  }
  function prepareContext() {
    try {
      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
        analyser = context.createAnalyser(); analyser.fftSize = 1024;
        analyser.connect(context.destination);
        samples = new Float32Array(analyser.fftSize);
      }
      context.resume().catch(() => {});
      return true;
    } catch { p.analysis = 'unavailable'; return false; }
  }
  function fail() {
    clearTimeout(p._timer);
    if (!p.station) return;
    if (p.state === 'paused') { p.analysis = 'unavailable'; return; }
    if (httpsPage) {
      // 公网 HTTPS：只重试中继（最多 3 次），不做必然被混合内容拦截的直连
      if (p.attempts < 3) { start(p.mode === 'hls' ? 'hls' : 'relay'); return; }
      detach();
      p.analysis = 'unavailable'; set('error');
      return;
    }
    // A direct, unconnected media element keeps streams audible even when a
    // relay/format is unsupported. Never claim a beat for this fallback.
    if (p.mode === 'hls') { start('cors'); return; }
    if (p.mode === 'relay') { start('cors'); return; }
    if (p.mode === 'cors') { start('direct'); return; }
    detach();
    p.analysis = 'unavailable'; set('error');
  }
  function start(mode) {
    detach();
    p.mode = mode; p.attempts++;
    const element = new Audio(); audio = element; p.audio = element;
    element.preload = 'none'; element.volume = p.volume; element.muted = p.muted;
    p.analysis = 'unavailable';
    if (mode === 'cors' || mode === 'hls') element.crossOrigin = 'anonymous';
    if (mode !== 'direct' && context && analyser) {
      source = context.createMediaElementSource(element); source.connect(analyser);
      p.analysis = 'ready';
    }
    element.onplaying = () => { if (audio !== element) return; clearTimeout(p._timer); set('playing'); };
    element.onpause = () => { if (audio === element && p.state !== 'idle') set('paused'); };
    element.onerror = element.onended = () => { if (audio === element) fail(); };
    const stream = playbackSource(p.station.url);
    set('tuning');
    const playElement = () => {
      if (audio !== element || p.state === 'paused') return;
      element.play().catch(error => {
        if (audio !== element) return;
        if (error.name === 'NotAllowedError') { clearTimeout(p._timer); set('paused'); }
        // Media decoding/network errors are handled by onerror.
      });
    };
    p._timer = setTimeout(() => { if (audio === element && p.state === 'tuning') fail(); }, 16000);
    if (mode === 'hls') {
      // Load only for HLS stations; ordinary MP3/AAC playback stays lightweight.
      // HTTPS 页面下经同源中继加载（服务端重写播放列表），规避混合内容拦截。
      const hlsSource = httpsPage
        ? `/api/stream/${encodeURIComponent(p.station.id)}`
        : stream.url;
      import('hls.js').then(({ default: Hls }) => {
        if (audio !== element) return;
        if (!Hls.isSupported()) {
          element.src = hlsSource;
          playElement();
          return;
        }
        const controller = new Hls({ enableWorker: true, backBufferLength: 15 });
        hls = controller;
        controller.on(Hls.Events.MANIFEST_PARSED, playElement);
        controller.on(Hls.Events.ERROR, (_event, data) => {
          if (audio === element && data.fatal) fail();
        });
        controller.loadSource(hlsSource);
        controller.attachMedia(element);
      }).catch(() => { if (audio === element) fail(); });
    } else {
      element.src = mode === 'relay' ? `/api/stream/${encodeURIComponent(p.station.id)}` : stream.url;
      playElement();
    }
  }
  p.play = station => {
    if (!station) return;
    p.stop(); p.station = station; p.attempts = 0;
    prepareContext();
    fetch(`/api/click/${station.id}`, { method: 'POST' }).catch(() => {});
    start(playbackSource(station.url).hls ? 'hls' : 'relay');
  };
  p.pause = () => { clearTimeout(p._timer); audio?.pause(); set('paused'); };
  p.resume = () => {
    if (!audio || p.state === 'error') { if (p.station) p.play(p.station); return; }
    context?.resume().catch(() => {});
    const current = audio;
    current.play().catch(() => { if (audio === current) set('error'); });
  };
  p.toggle = () => ['playing', 'tuning'].includes(p.state) ? p.pause() : p.resume();
  p.stop = () => { detach(); p.station = null; p.state = 'idle'; p.analysis = 'idle'; };
  p.sampleLevel = dt => {
    let target = 0;
    if (p.state === 'playing' && !p.muted && p.analysis === 'ready' && context?.state === 'running') {
      analyser.getFloatTimeDomainData(samples);
      target = rmsLevel(samples) * p.volume;
    }
    p.level = smoothLevel(p.level, target, dt);
    return p.level;
  };
  p.setVolume = value => {
    p.volume = Math.min(1, Math.max(0, value)); p.muted = false;
    if (audio) { audio.volume = p.volume; audio.muted = false; }
    try { localStorage.setItem('rd.volume', p.volume); localStorage.setItem('rd.muted', '0'); } catch {}
    return p.volume;
  };
  p.toggleMute = () => {
    p.muted = !p.muted; if (audio) audio.muted = p.muted;
    try { localStorage.setItem('rd.muted', p.muted ? '1' : '0'); } catch {}
    return p.muted;
  };
  return p;
}
