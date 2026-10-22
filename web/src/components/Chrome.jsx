// 顶栏 / 时钟 / 准星 / 提示 / toast
import { useEffect, useState } from 'react';
import { t, getLang } from '../i18n.js';
import { flagOf, countryName, localTimeAt } from '../geo.js';
import { useStore } from '../store.js';

const fmtN = n => (n == null ? '—' : n.toLocaleString('en-US'));

// 每 ms 滴答一次（当地时间/坞时间用）
export function useNow(ms = 10000) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN(x => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}

export function TopBar({ stats, onView, onSearch, onSaved, onFilters, onLang, onHome }) {
  const s = useStore();
  return (
    <header className="topbar">
      <div className="brand">
        <button className="brand-home" onClick={onHome} aria-label="RoamDial · 回到全景">
        <svg className="mark" width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><path d="M52.28 27.56A21 21 0 1 1 37.44 12.72" fill="none" stroke="currentColor" strokeWidth="7.5" strokeLinecap="round"/><path d="M25.5 40.5L34.5 31.5" fill="none" stroke="currentColor" strokeWidth="7.5" strokeLinecap="round"/><circle cx="47.9" cy="17.1" r="4.8" fill="var(--signal)"/></svg>
        <span className="bname">RoamDial</span></button>
        <span className="bstats mono">{stats ? `${t('stations-n', { n: fmtN(stats.total) })} · ${t('countries-n', { n: fmtN(stats.countries) })}` : '—'}</span>
      </div>
      <nav className="tnav">
        <button className="tbtn" onClick={onSearch} aria-label={t('search')} title={t('search')}>
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <div className="seg">
          <button className={'segbtn' + (s.view === 'globe' ? ' on' : '')} onClick={() => onView('globe')}>{t('globe')}</button>
          <button className={'segbtn' + (s.view === 'sky' ? ' on' : '')} onClick={() => onView('sky')}>{t('sky')}</button>
        </div>
        <button className="tbtn saved-button" aria-label={t('saved')} onClick={onSaved}>
          <svg viewBox="0 0 24 24"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
          <span>{t('saved')}</span><span className="saved-count mono">{s.savedCount}</span>
        </button>
        <button className="tbtn lang" onClick={onLang}>{getLang() === 'zh' ? 'EN' : '中'}</button>
      </nav>
    </header>
  );
}

export function Clock({ station }) {
  useNow(10000);
  if (!station) return null;
  const now = localTimeAt(station.cc, station.elng, Date.now());
  return (
    <div className="clock">
      <div className="ctime mono">{now ? `${String(now.h).padStart(2, '0')}:${String(now.m).padStart(2, '0')}` : '--:--'}</div>
      <div className="cplace mono">{station.state ? `${station.state.toUpperCase()} · ` : ''}{countryName(station.cc, station.country)} · {t('local-time')}</div>
    </div>
  );
}

export function Reticle() {
  const s = useStore();
  const len = 2 * Math.PI * 34;
  return (
    <div className="reticle" data-state={s.reticle}>
      <svg viewBox="0 0 100 100">
        <circle className="r-ring" cx="50" cy="50" r="34" />
        <circle className="r-ring2" cx="50" cy="50" r="34"
          style={{ strokeDasharray: len, strokeDashoffset: len * (1 - s.holdProgress) }} />
        <circle className="r-dot" cx="50" cy="50" r="2.6" />
        {Array.from({length: 48}, (_, i) => {
          const a = i * Math.PI / 24, inner = i % 4 === 0 ? 40 : 43;
          return <line key={i} className="r-tick" x1={50 + Math.sin(a) * inner} y1={50 - Math.cos(a) * inner} x2={50 + Math.sin(a) * 47} y2={50 - Math.cos(a) * 47} />;
        })}
        <circle className="r-status" cx="74" cy="26" r="4" />
      </svg>
      {s.hintPx != null && <div className="r-px mono">{s.hintPx} PX</div>}
    </div>
  );
}

export function Hint() {
  return (
    <div className="hint">
      <span>{t('hint-drag')}</span>
      <span>{t('hint-hold')}</span>
      <span className="mono">{t('hint-keys')}</span>
      <span className="mono">{t('hint-keys2')}</span>
      <span className="mono">{t('hint-keys3')}</span>
    </div>
  );
}

export function Tuning() {
  const s = useStore();
  const st = s.selected;
  if (!st || s.playerState === 'idle' || s.playerState === 'playing') return null;
  const map = {
    tuning: t('tuning'), locked: t('locked'), paused: t('paused'), error: t('error')
  };
  return (
    <div className="tuning" data-state={s.playerState}>
      <span className="tdot" />
      <span>{map[s.playerState] || ''}</span>
    </div>
  );
}

export function Toast() {
  const s = useStore();
  if (!s.toast) return null;
  return <div className="toast" key={s.toast.id}>{s.toast.text}</div>;
}
