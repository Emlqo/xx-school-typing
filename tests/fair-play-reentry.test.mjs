import test from 'node:test';
import assert from 'node:assert/strict';
import { readScreenExit, rememberScreenExit } from '../src/utils/fairPlay.js';

test('teacher revision clears old locks, but a new violation remains locked', () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  try {
    localStorage.setItem('screen-exit:legacy', 'focus');
    assert.equal(readScreenExit('legacy', 0), 'focus');
    assert.equal(readScreenExit('legacy', 1), '');
    rememberScreenExit('student', 'fullscreen', 0);
    assert.equal(readScreenExit('student', 0), 'fullscreen');
    assert.equal(readScreenExit('student', 1), '');
    rememberScreenExit('student', 'hidden', 1);
    assert.equal(readScreenExit('student', 1), 'hidden');
    assert.equal(readScreenExit('student'), 'hidden');
    assert.equal(readScreenExit('student', 2), '');
    rememberScreenExit('other', 'focus', 0);
    assert.equal(readScreenExit('other', 0), 'focus');
  } finally { delete globalThis.localStorage; }
});
