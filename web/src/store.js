// 极简外部 store（useSyncExternalStore），重数据留在 Data 模块，React 只管 UI 状态
import { useSyncExternalStore } from 'react';

function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      subs.forEach(f => f());
    },
    subscribe(f) {
      subs.add(f);
      return () => subs.delete(f);
    }
  };
}

export const store = createStore({
  view: 'globe',
  selected: null,
  nearby: [],
  playerState: 'idle',
  filter: { genre: 'all', bitrate: 0, country: 'all', language: 'all' },
  savedCount: 0,
  lang: 'zh',
  loading: true,
  loadError: null,
  introVisible: true,
  panels: { filters: false, search: false, saved: false },
  toast: null,
  reticle: '',
  holdProgress: 0,
  hintPx: null,
  nowMeta: '',
  muted: false,
  filterVersion: 0
});

export function useStore() {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

export const actions = {
  set: patch => store.set(patch),
  toast(text, ms = 2600) {
    store.set({ toast: { text, id: Math.random() } });
    clearTimeout(actions._tt);
    actions._tt = setTimeout(() => store.set({ toast: null }), ms);
  },
  panel(name, open) {
    const panels = { ...store.get().panels, [name]: open };
    store.set({ panels });
  }
};
