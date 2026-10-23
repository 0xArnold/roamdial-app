import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const station = {
  id: 'us-test', name: 'Classic Vinyl HD', cc: 'US', country: 'The United States Of America',
  state: 'New York NY', genre: 'jazz', lang: 'english', bitrate: 320, tags: [], elng: -74
};

test('Dock renders the visible next label in the active language', async t => {
  const vite = await createServer({ root: new URL('..', import.meta.url).pathname, server: { middlewareMode: true }, appType: 'custom' });
  t.after(() => vite.close());
  const [{ Dock }, { setLang }, { store }] = await Promise.all([
    vite.ssrLoadModule('/src/components/Dock.jsx'),
    vite.ssrLoadModule('/src/i18n.js'),
    vite.ssrLoadModule('/src/store.js')
  ]);
  setLang('en');
  store.set({ selected: station, introVisible: false, loading: false, playerState: 'idle' });
  const html = renderToStaticMarkup(React.createElement(Dock, {
    onPlay() {}, onPrev() {}, onNext() {}, onSave() {}, onShare() {},
    onMute() {}, onVolume() {}, onTag() {}, onStart() {}, onEnter() {}
  }));
  assert.match(html, /<span class="next-label">Next<\/span>/);
});
