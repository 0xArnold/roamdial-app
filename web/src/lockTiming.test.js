import test from 'node:test';
import assert from 'node:assert/strict';
import { lockProgress } from './lockTiming.js';
test('lock takes 350ms after pointer settles, not 5x longer at throttled picking', () => {
  assert.equal(lockProgress(1000,1000,1000),0);
  assert.equal(lockProgress(1080,1000,1000),0);
  assert.equal(lockProgress(1255,1000,1000),.5);
  assert.equal(lockProgress(1430,1000,1000),1);
  for (const step of [16,33,83,166]) {
    let now=1000;while(lockProgress(now,1000,1000)<1) now+=step;
    assert(now>=1430 && now<1430+step);
  }
});
test('candidate change and renewed motion restart the lock, progress never becomes negative',()=>{
  assert.equal(lockProgress(1400,1400,1000),0);
  assert.equal(lockProgress(1400,1000,1390),0);
  assert.equal(lockProgress(2000,1000,1390),1);
});
