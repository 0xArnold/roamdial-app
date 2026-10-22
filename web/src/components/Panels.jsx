// 底部流派条 + 筛选面板 + 搜索浮层 + 收藏面板
import { useState, useMemo } from 'react';
import { t, genreName, getLang } from '../i18n.js';
import { flagOf, countryName } from '../geo.js';
import { Data, getSaved, genreColor } from '../data.js';
import { useStore, actions } from '../store.js';

const fmtN = n => (n == null ? '—' : n.toLocaleString('en-US'));

export function GenreBar({ filteredCount, onFilter }) {
  const s = useStore();
  return (
    <footer className="genrebar">
      <button className="gfilter" onClick={() => actions.panel('filters', !s.panels.filters)}>
        <svg viewBox="0 0 24 24"><path d="M3 6h18M6 12h12M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <span>{t('filters')}</span>
        <span className="fcount mono">{fmtN(filteredCount)}</span>
      </button>
      <div className="gchips">
        <button className={'gchip' + (Data.filter.genre === 'all' ? ' on' : '')} onClick={() => onFilter({ genre: 'all' })}>
          <span>{t('all')}</span><i className="mono">{fmtN(Data.total)}</i>
        </button>
        {Data.genres.map(g => (
          <button key={g.key} className={'gchip' + (Data.filter.genre === g.key ? ' on' : '')} onClick={() => onFilter({ genre: g.key })}>
            <span className="genre-dot" style={{ background: `rgb(${genreColor(g.key).map(v => Math.round(v * 255)).join(',')})` }} /><span>{genreName(g.key)}</span><i className="mono">{fmtN(g.count)}</i>
          </button>
        ))}
      </div>
    </footer>
  );
}

export function FilterPanel({ stats, onFilter }) {
  const s = useStore();
  const [langOpen, setLangOpen] = useState(false);
  const f = Data.filter;
  const langs = Data.languages.filter(l => l.name);
  const show = langOpen ? langs : langs.slice(0, 10);
  const unlabeled = Data.total - langs.reduce((a, l) => a + l.count, 0);
  return (
    <aside className={'fpanel' + (s.panels.filters ? '' : ' hide')}>
      <div className="fp-sec">
        <div className="fp-t">{t('bitrate')}</div>
        <div className="seg c4">
          {[0, 128, 192, 320].map(v => (
            <button key={v} className={'segbtn' + (f.bitrate === v ? ' on' : '')} onClick={() => onFilter({ bitrate: v })}>
              {v === 0 ? t('all') : (v === 320 ? '320 kbps' : `≥ ${v} kbps`)}
            </button>
          ))}
        </div>
      </div>
      <div className="fp-sec">
        <div className="fp-t">{t('country')}</div>
        <div className="dd">
          <select className="ddbtn" value={f.country} onChange={e => onFilter({ country: e.target.value })}>
            <option value="all">{t('all-countries')}</option>
            {Data.countries.map(c => (
              <option key={c.cc} value={c.cc}>{flagOf(c.cc)} {countryName(c.cc)} ({fmtN(c.count)})</option>
            ))}
          </select>
        </div>
      </div>
      <div className="fp-sec">
        <div className="fp-t">{t('language')}</div>
        <div className="lchips">
          <button className={'lchip' + (f.language === 'all' ? ' on' : '')} onClick={() => onFilter({ language: 'all' })}>
            <span>{t('all')}</span><i className="mono">{fmtN(Data.total)}</i>
          </button>
          {show.map(l => (
            <button key={l.name} className={'lchip' + (f.language === l.name ? ' on' : '')} onClick={() => onFilter({ language: l.name })}>
              <span>{l.name}</span><i className="mono">{fmtN(l.count)}</i>
            </button>
          ))}
          <button className={'lchip' + (f.language === '' ? ' on' : '')} onClick={() => onFilter({ language: '' })}>
            <span>{t('unknown-lang')}</span><i className="mono">{fmtN(unlabeled)}</i>
          </button>
        </div>
        {langs.length > 10 && (
          <button className="chip more" onClick={() => setLangOpen(v => !v)}>{langOpen ? '收起' : t('more')}</button>
        )}
      </div>
      <div className="fp-sec">
        <div className="fp-t">{t('data-source')}</div>
        <div className="fp-src">
          <span className="mono">Radio Browser · {fmtN(Data.total)} · {stats && stats.updatedAt ? new Date(stats.updatedAt).toLocaleDateString() : ''}</span>
        </div>
      </div>
    </aside>
  );
}

export function SearchOverlay({ query, setQuery, onPick, onClose }) {
  const s = useStore();
  const q = query;
  const results = useMemo(() => (q.trim() ? Data.search(q, 14) : []), [q]);
  if (!s.panels.search) return null;
  return (
    <div className="searchbar">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      <input autoFocus value={q} onChange={e => setQuery(e.target.value)}
        placeholder={t('search-ph')} onKeyDown={e => { if (e.key === 'Enter' && results[0]) onPick(results[0]); if (e.key === 'Escape') onClose(); }} />
      <span className="esc mono" onClick={onClose}>ESC</span>
      {q.trim() && (
        <div className="results">
          {results.length ? (
            <>
              <div className="scount mono">{t('results-n', { n: results.length })}</div>
              {results.map(r => (
                <button className="srow" key={r.id} onClick={() => onPick(r)}>
                  <span className="sr-flag">{flagOf(r.cc)}</span>
                  <span className="sr-main">
                    <b>{r.name}</b>
                    <i className="mono">{[r.state, countryName(r.cc, r.country)].filter(Boolean).join(' · ')} · {genreName(r.genre)}{r.bitrate ? ` · ${r.bitrate}k` : ''}</i>
                  </span>
                </button>
              ))}
            </>
          ) : <div className="sempty">{t('no-result')}</div>}
        </div>
      )}
    </div>
  );
}

export function SavedPanel({ onPick, onClose }) {
  const s = useStore();
  const ids = getSaved();
  if (!s.panels.saved) return null;
  return (
    <aside className="spanel">
      <div className="sp-hd">
        <span>{t('saved')}</span>
        <span className="mono">{ids.length}</span>
        <button className="sp-x" onClick={onClose}>✕</button>
      </div>
      <div className="sp-list">
        {ids.length ? ids.map(id => {
          const st = Data.byId.get(id);
          if (!st) return null;
          return (
            <button className="svrow" key={id} onClick={() => onPick(st)}>
              <span className="sr-flag">{flagOf(st.cc)}</span>
              <span className="sr-main">
                <b>{st.name}</b>
                <i className="mono">{countryName(st.cc, st.country)} · {genreName(st.genre)}</i>
              </span>
            </button>
          );
        }) : <div className="sempty">{t('saved-empty')}</div>}
      </div>
    </aside>
  );
}
