// 开场卡片
import { t, getLang } from '../i18n.js';
import { useStore } from '../store.js';

const fmtN = n => (n == null ? '…' : n.toLocaleString('en-US'));

export function Intro({ stats, onStart, onExplore }) {
  const s = useStore();
  if (!s.introVisible) return null;
  return (
    <div className="intro">
      <div className="ibrand">
        <div className="logo">
          <svg className="mark" width="24" height="24" viewBox="0 0 64 64" aria-hidden="true"><path d="M52.28 27.56A21 21 0 1 1 37.44 12.72" fill="none" stroke="currentColor" strokeWidth="7.5" strokeLinecap="round"/><path d="M25.5 40.5L34.5 31.5" fill="none" stroke="currentColor" strokeWidth="7.5" strokeLinecap="round"/><circle cx="47.9" cy="17.1" r="4.8" fill="var(--signal)"/></svg>
          <span>RoamDial</span>
        </div>
        <div className="islog">{t('slogan')}</div>
        <div className="isrc">{t('slogan-src')}</div>
      </div>
      <div className="inow">
        <div className="ik"><i /><span>{stats ? `${fmtN(stats.total)} ${t('stations-n', { n: '' })} · ${fmtN(stats.countries)} ${t('countries-n', { n: '' })}` : t('loading')}</span></div>
        <h1 className="inm" dangerouslySetInnerHTML={{ __html: t('title') }} />
        <p className="isub">{t('subtitle')}</p>
        <div className="iacts">
          <button className="btn primary big" disabled={s.loading} onClick={onStart}>
            <svg viewBox="0 0 24 24" className="ic f"><path d="M8 5.5v13l10.5-6.5z" /></svg>
            <span>{s.loading ? t('loading') : (getLang() === 'zh' ? '开始收听' : 'Start listening')}</span>
          </button>
          <button className="lnk" onClick={onExplore}>{t('explore')}</button>
        </div>
      </div>
      <div className="credit mono">
        <span>电台目录来自 <a href="https://www.radio-browser.info/" target="_blank" rel="noopener">Radio Browser</a> · 地理底图来自 Natural Earth</span> · <span>{t('replica-note')}</span>
      </div>
    </div>
  );
}
