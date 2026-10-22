// 中英文案。en 缺省回落到 zh 键值本身（中文键即默认文案）。
export const STRINGS = {
  zh: {
    'globe': '地球',
    'sky': '流派星云',
    'saved': '收藏',
    'filters': '筛选',
    'all': '全部',
    'bitrate': '码率',
    'country': '国家 / 地区',
    'all-countries': '全部国家',
    'language': '语言',
    'more': '更多…',
    'data-source': '数据',
    'refresh': '从 Radio Browser 刷新',
    'search': '搜索',
    'search-ph': '搜电台、城市或国家… (/)',
    'prev': '上一站',
    'next': '下一站',
    'slogan': '缘溪行，忘路之远近',
    'slogan-src': '— 陶渊明《桃花源记》',
    'title': '随机一站，<br>听见世界。',
    'subtitle': '按下播放，目的地交给运气。',
    'loading': '正在载入电台…',
    'explore': '先逛逛星图',
    'credit': '电台目录来自 Radio Browser · 地理数据来自 GeoNames',
    'replica-note': 'RoamDial 风格复刻 · 非官方',
    'hint-drag': '拖动 旋转 · 滚轮 远近',
    'hint-hold': '准星停稳 自动收听',
    'hint-keys': '→ 下一站 · ← 上一站 · ↑ ↓ 同城换台',
    'hint-keys2': 'G 切换视图 · / 搜索 · F 收藏 · L 固定',
    'hint-keys3': '空格 暂停 · M 静音 · Enter 进入当前电台',
    'tuning': '调谐中…',
    'locked': '已锁定',
    'connecting': '正在连接…',
    'playing': '正在播放',
    'paused': '已暂停 · 空格继续',
    'error': '线路不通，换一条…',
    'nearby': '附近 {n} 个台 · ↑ ↓ 逐台',
    'local-time': '当地时间',
    'save': '收藏',
    'saved-ok': '已收藏',
    'unsave': '取消收藏',
    'share': '分享',
    'share-ok': '链接已复制',
    'share-fail': '复制失败，请手动复制地址栏',
    'enter': '进入',
    'enter-station': '进入 · Enter →',
    'stations-n': '{n} 个电台',
    'countries-n': '{n} 国家和地区',
    'no-result': '没有找到电台',
    'results-n': '{n} 个结果',
    'refresh-ok': '目录已更新 · {n} 个电台',
    'refresh-fail': '刷新失败，沿用内置目录',
    'filtered': '筛选后 {n} 个电台',
    'saved-empty': '还没有收藏。听到喜欢的台，按 F 或点 ♡ 收起来。',
    'saved-count': '收藏 {n}',
    'unknown-lang': '未标注',
    'local-time-approx': '当地时间 · 约',
    'dir-loading': '载入中…'
  },
  en: {
    'globe': 'Globe',
    'sky': 'Genre sky',
    'saved': 'Saved',
    'filters': 'Filters',
    'all': 'All',
    'bitrate': 'Bitrate',
    'country': 'Country / region',
    'all-countries': 'All countries',
    'language': 'Language',
    'more': 'More…',
    'data-source': 'Data',
    'refresh': 'Refresh from Radio Browser',
    'search': 'Search',
    'search-ph': 'Search station, city or country… (/)',
    'prev': 'Previous',
    'next': 'Next',
    'slogan': 'Follow the stream, forget how far.',
    'slogan-src': '— Tao Yuanming, “The Peach Blossom Spring”',
    'title': 'Listen<br>somewhere new.',
    'subtitle': 'Press play. Leave the destination to chance.',
    'loading': 'Loading stations…',
    'explore': 'Explore the sky',
    'credit': 'Station directory by Radio Browser · places by GeoNames',
    'replica-note': 'RoamDial-style replica · unofficial',
    'hint-drag': 'Drag to turn · scroll to zoom',
    'hint-hold': 'Hold the reticle still to listen',
    'hint-keys': '→ next · ← prev · ↑ ↓ nearby',
    'hint-keys2': 'G switch view · / search · F save · L pin',
    'hint-keys3': 'Space pause · M mute · Enter step into a station',
    'tuning': 'Tuning…',
    'locked': 'Locked',
    'connecting': 'Connecting…',
    'playing': 'Playing',
    'paused': 'Paused · space to resume',
    'error': 'Stream dead, trying next…',
    'nearby': '{n} nearby · ↑ ↓ station by station',
    'local-time': 'Local time',
    'save': 'Save',
    'saved-ok': 'Saved',
    'unsave': 'Remove',
    'share': 'Share',
    'share-ok': 'Link copied',
    'share-fail': 'Copy failed — copy from the address bar',
    'enter': 'Step in',
    'enter-station': 'Step in · Enter →',
    'stations-n': '{n} stations',
    'countries-n': '{n} countries & regions',
    'no-result': 'No stations found',
    'results-n': '{n} results',
    'refresh-ok': 'Directory updated · {n} stations',
    'refresh-fail': 'Refresh failed — using bundled directory',
    'filtered': '{n} stations after filters',
    'saved-empty': 'Nothing saved yet. Press F or tap ♡ when a station grows on you.',
    'saved-count': 'Saved {n}',
    'unknown-lang': 'Unlabeled',
    'local-time-approx': 'Local time · approx',
    'dir-loading': 'Loading…'
  }
};

let lang = 'zh';

export function setLang(l) { lang = (l === 'en') ? 'en' : 'zh'; }
export function getLang() { return lang; }

export function t(key, vars) {
  let s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.zh[key] || key;
  if (vars) for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
  return s;
}

// 流派中英文案
export const GENRE_ZH = {
  mixed: '综合', pop: '流行', news: '新闻谈话', rock: '摇滚', electronic: '电子',
  world: '地方与世界', religious: '宗教', classical: '古典', jazz: '爵士蓝调',
  country: '乡村民谣', hiphop: '嘻哈', oldies: '老歌', latin: '拉丁雷鬼',
  other: '其他'
};
export const GENRE_EN = {
  mixed: 'Mixed', pop: 'Pop', news: 'News & Talk', rock: 'Rock', electronic: 'Electronic',
  world: 'Local & World', religious: 'Religious', classical: 'Classical', jazz: 'Jazz & Blues',
  country: 'Country & Folk', hiphop: 'Hip-hop', oldies: 'Oldies', latin: 'Latin & Reggae',
  other: 'Other'
};
export function genreName(g) {
  return lang === 'en' ? (GENRE_EN[g] || g) : (GENRE_ZH[g] || g);
}

export function detectLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'zh' || q === 'en') return q;
    const ls = localStorage.getItem('roamdial.lang');
    if (ls === 'zh' || ls === 'en') return ls;
  } catch (e) { /* ignore */ }
  return /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
}
