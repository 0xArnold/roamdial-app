import test from 'node:test';
import assert from 'node:assert/strict';
import { publicTarget } from './stream.js';

test('relay refuses local, private, metadata and credential URLs', async () => {
  for (const target of ['http://127.0.0.1', 'http://10.0.0.1', 'http://[::1]', 'http://[::ffff:127.0.0.1]', 'http://169.254.169.254', 'file:///etc/passwd', 'https://user:pass@example.com']) {
    await assert.rejects(publicTarget(target), undefined, target);
  }
});
