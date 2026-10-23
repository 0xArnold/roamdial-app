// 播放坞 + 电台拨盘
import { useRef } from 'react';
import { t, genreName, getLang } from '../i18n.js';
import { flagOf, countryName, localTimeAt } from '../geo.js';
import { Data, isSaved } from '../data.js';
import { useStore } from '../store.js';
import { useNow } from './Chrome.jsx';

const fmtN = n => (n == null ? '—' : n.toLocaleString('en-US'));

export function Dock({ onPlay, onPrev, onNext, onSave, onShare, onMute, onVolume, onTag, onStart, onEnter }) {
  const s = useStore();
  useNow(10000);
  if (s.introVisible || s.loading) return null;
  const st = s.selected;
  if (!st) return <section className="dock empty-dock">
    <div className="dstatus">{t('subtitle')}</div><h1 className="dname">{t('title').replace('<br>', '')}</h1>
    <p className="isub">拖动星图，准星对准一个光点就能听</p>
    <button className="btn primary" onClick={onStart}>▶ 开始收听</button>
  </section>;
  const saved = isSaved(st.id);
  const now = localTimeAt(st.cc, st.elng, Date.now());
  const timeText = now ? `${String(now.h).padStart(2, '0')}:${String(now.m).padStart(2, '0')}` : '--:--';
  const place = [st.state, countryName(st.cc, st.country, getLang())].filter(Boolean).join(' · ');
  return (
    <section className="dock">
      <div className="dstatus mono" role="status">{t(s.playerState === 'idle' ? 'locked' : s.playerState)}</div>
      <h1 className="dname">{st.name}</h1>
      <div className="dtop">
        <span className="dflag">{flagOf(st.cc)}</span>
        <span className="dplace">{place}</span>
        <span className="dtime mono">{timeText}</span>
      </div>
      <div className="dmeta mono">
        {genreName(st.genre)} · {st.lang || t('unknown-lang')} · {st.bitrate ? `${st.bitrate} kbps` : '—'}
      </div>
      <div className="dtags">
        {st.tags.slice(0, 3).map(tg => (
          <button className="dtag" key={tg} onClick={() => onTag && onTag(tg)}>{tg}</button>
        ))}
      </div>
      <div className="dacts">
        <button className="abtn" onClick={onPrev} title={t('prev')}>
          <svg viewBox="0 0 24 24"><path d="M17 5v14L8 12z" fill="currentColor"/><rect x="5" y="5" width="2.4" height="14" rx="1" fill="currentColor"/></svg>
        </button>
        <button className="abtn play" aria-label={s.playerState === 'playing' ? '暂停' : '播放'} onClick={onPlay}>
          <svg className="ic-play" viewBox="0 0 24 24" style={{ display: s.playerState === 'playing' ? 'none' : '' }}><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>
          <svg className="ic-pause" viewBox="0 0 24 24" style={{ display: s.playerState === 'playing' ? '' : 'none' }}><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>
        </button>
        <button className="abtn next" onClick={onNext} title={t('next')}>
          <svg viewBox="0 0 24 24"><path d="M7 5v14l9-7z" fill="currentColor"/><rect x="16.6" y="5" width="2.4" height="14" rx="1" fill="currentColor"/></svg>
          <span className="next-label">{t('next')}</span>
        </button>
        <span className="dsep" />
        <button className={'abtn' + (saved ? ' on' : '')} onClick={onSave} title={saved ? t('unsave') : t('save')}>
          <svg viewBox="0 0 24 24"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
        </button>
        <button className="abtn" onClick={onShare} title={t('share')}>
          <svg viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        </div><div className="dsecondary"><button className="enter-link mono" onClick={onEnter}>{t('enter-station')}</button><span className="dvol">
          <button className="abtn sm" aria-label={s.muted ? '取消静音' : '静音'} onClick={onMute}>
            <svg className="ic-vol" viewBox="0 0 24 24" style={{ display: s.muted ? 'none' : '' }}><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <svg className="ic-mute" viewBox="0 0 24 24" style={{ display: s.muted ? '' : 'none' }}><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          <input type="range" min="0" max="100" defaultValue="80" onChange={e => onVolume(parseFloat(e.target.value) / 100)} aria-label="volume" />
        </span>
      </div>
    </section>
  );
}

export function Dial({ onPick }) {
  const s = useStore();
  const svgRef = useRef(null);
  const st = s.selected;
  if (!st) return null;
  const list = Data.filtered();
  const i = Math.max(0, list.findIndex(x => x.id === st.id));
  const n = list.length || 1;
  const angle = -135 + (i / n) * 270;

  const angleTo = e => {
    const r = svgRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let a = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
    a = ((a % 360) + 360) % 360;
    if (a > 135 && a <= 180) return 0;
    if (a > 180) return 1;
    return Math.max(0, Math.min(1, (a + 135) / 270));
  };

  return (
    <div className="dial">
      <svg viewBox="0 0 120 120" ref={svgRef}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget._from = angleTo(e); }}
        onPointerMove={e => {
          if (e.currentTarget._from == null) return;
          const idx = Math.round(angleTo(e) * (n - 1));
          const pick = list[idx];
          if (pick && (!st || pick.id !== st.id)) onPick(pick);
        }}
        onPointerUp={e => { e.currentTarget._from = null; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ } }}>
        <circle className="dl-base" cx="60" cy="60" r="52" />
        <circle className="dl-inner" cx="60" cy="60" r="40" />
        <g>{Array.from({ length: 21 }, (_, k) => {
          const a = (-135 + (k / 20) * 270 - 90) * Math.PI / 180;
          return <line key={k}
            x1={60 + 44 * Math.cos(a)} y1={60 + 44 * Math.sin(a)}
            x2={60 + (k % 5 === 0 ? 37 : 41) * Math.cos(a)} y2={60 + (k % 5 === 0 ? 37 : 41) * Math.sin(a)}
            stroke={k % 5 === 0 ? 'rgba(245,241,232,.5)' : 'rgba(245,241,232,.22)'}
            strokeWidth={k % 5 === 0 ? 1.6 : 1} />;
        })}</g>
        <line className="dl-needle" x1="60" y1="60" x2="60" y2="12" transform={`rotate(${angle} 60 60)`} />
        <circle className="dl-cap" cx="60" cy="60" r="7" />
      </svg>
      <div className="dl-label mono">{i + 1} / {fmtN(n)}</div>
    </div>
  );
}
