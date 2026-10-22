import test from 'node:test';
import assert from 'node:assert/strict';
import { rmsLevel, smoothLevel } from './audioEnvelope.js';

test('silence and low noise do not create a synthetic beat', () => {
  assert.equal(rmsLevel(new Float32Array(1024)), 0);
  assert.equal(rmsLevel(new Float32Array(1024).fill(0.003)), 0);
});
test('louder PCM produces stronger, bounded response', () => {
  const wave = amplitude => Float32Array.from({length:1024}, (_,i)=>Math.sin(i * 0.2) * amplitude);
  const quiet = rmsLevel(wave(0.03)), speech = rmsLevel(wave(0.15));
  assert(quiet > 0 && speech > quiet);
  assert.equal(rmsLevel(wave(2)), 1);
});
test('pause and mute decay to zero at different frame rates', () => {
  for (const fps of [30, 60, 120]) {
    let level = 0.9;
    for (let i = 0; i < fps * 3; i++) level = smoothLevel(level, 0, 1 / fps);
    assert.equal(level, 0);
  }
});
