import { beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement } from 'react';
import { setup } from './helpers.mjs';
import { safeParseJson, useStorage } from '../dist/index.js';
let ui, api;
beforeEach(async () => (ui = await setup()));
afterEach(async () => ui.cleanup());
test('unsafe JSON and byte overflows are rejected', () => {
  assert.throws(() => safeParseJson('{"__proto__":{"polluted":true}}'), /Unsafe/);
  assert.throws(() => safeParseJson('"long"', 2), /limit/);
  assert.equal({}.polluted, undefined);
});
test('validated storage persists, migrates and synchronizes external updates', async () => {
  window.localStorage.setItem('test', JSON.stringify({ version: 1, data: 3 }));
  function App() {
    api = useStorage('test', 0, {
      version: 2,
      validate: (value) => typeof value === 'number',
      migrate: (value) => value + 1,
    });
    return null;
  }
  await ui.render(createElement(App));
  assert.equal(api.value, 4);
  await act(() => assert.equal(api.set(5), true));
  assert.equal(api.value, 5);
  window.localStorage.setItem('test', JSON.stringify({ version: 2, data: 'invalid' }));
  await act(() => window.dispatchEvent(new window.StorageEvent('storage', { key: 'test' })));
  assert.ok(api.error);
  assert.equal(api.value, 5);
});
