import test from 'node:test';
import assert from 'node:assert/strict';
import { countryName } from './geo.js';

test('countryName follows the active interface language', () => {
  assert.equal(countryName('US', 'The United States Of America', 'en'), 'United States');
  assert.equal(countryName('US', 'The United States Of America', 'zh'), '美国');
});
