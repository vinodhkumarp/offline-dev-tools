import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { md5 } from './md5.ts';

test('md5 matches Node crypto for ASCII, Unicode, and block boundaries', () => {
  const inputs = ['', 'a', 'abc', 'hello world', 'é漢字😀', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'y'.repeat(1000)];
  for (const input of inputs) {
    assert.equal(md5(input), createHash('md5').update(input).digest('hex'), `input length ${input.length}`);
  }
});
