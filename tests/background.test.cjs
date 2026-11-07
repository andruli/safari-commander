const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function harness() {
  let listener, shortcut;
  const calls = [], session = {};
  const tabs = [
    { id: 1, windowId: 1, title: 'Regular', url: 'https://apple.com', incognito: false },
    { id: 2, windowId: 2, title: 'Private', url: 'https://example.com', incognito: true },
    { id: 3, windowId: 1, title: 'Second', url: 'https://webkit.org', incognito: false }
  ];
  const event = { addListener() {} };
  const browser = {
    runtime: { id: 'commander', getURL: file => `safari-web-extension://commander/${file}`, onMessage: { addListener(fn) { listener = fn; } } },
    commands: { onCommand: { addListener(fn) { shortcut = fn; } } },
    tabs: {
      query: async query => query.active ? [tabs[0]] : tabs.map(tab => ({ ...tab })),
      get: async id => { const tab = tabs.find(tab => tab.id === id); if (!tab) throw Error('Tab closed'); return tab; },
      update: async (...args) => calls.push(['update', ...args]),
      create: async (...args) => calls.push(['create', ...args]),
      reload: async (...args) => calls.push(['reload', ...args]),
      duplicate: async (...args) => calls.push(['duplicate', ...args]),
      remove: async (...args) => calls.push(['remove', ...args]),
      sendMessage: async (...args) => calls.push(['sendMessage', ...args]),
      onActivated: event, onRemoved: event
    },
    windows: { update: async (...args) => calls.push(['window', ...args]), create: async (...args) => calls.push(['new-window', ...args]) },
    scripting: { executeScript: async (...args) => calls.push(['inject', ...args]) },
    action: { openPopup: async () => calls.push(['popup']) },
    storage: { session: {
      get: async key => ({ [key]: session[key] }),
      set: async values => Object.assign(session, values),
      remove: async key => delete session[key]
    } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../extension/background.js'), 'utf8'), { browser, URL, console, crypto: { randomUUID: () => 'test-token' } });
  const sender = { id: 'commander', url: 'safari-web-extension://commander/palette.html' };
  return {
    calls, session, tabs, shortcut,
    send: (type, extra = {}, override = {}) => listener({ type: 'commander/' + type, tabId: 1, ...extra }, { ...sender, ...override })
  };
}
test('snapshots separate private windows and include only their session', async () => {
  const h = harness();
  let result = await h.send('snapshot');
  assert.equal(result.ok, true);
  assert.deepEqual(Array.from(result.data.tabs, tab => tab.id), [1, 3]);
  result = await h.send('snapshot', { tabId: 2 });
  assert.deepEqual(Array.from(result.data.tabs, tab => tab.id), [2]);
});
test('tab switching focuses its window and rejects private-session crossings', async () => {
  const h = harness();
  let result = await h.send('execute', { action: { kind: 'tab', tabId: 3 } });
  assert.equal(result.ok, true);
  assert.equal(h.calls[0][0], 'update'); assert.equal(h.calls[1][0], 'window');
  result = await h.send('execute', { action: { kind: 'tab', tabId: 2 } });
  assert.equal(result.ok, false); assert.equal(h.calls.length, 2);
});
test('navigation rejects executable URLs and runs valid navigation in the original window', async () => {
  const h = harness();
  for (const url of ['javascript:alert(1)', 'file:///tmp/test', 'https://name:secret@example.com']) {
    assert.equal((await h.send('execute', { action: { kind: 'navigation', url } })).ok, false);
  }
  assert.equal(h.calls.length, 0);
  assert.equal((await h.send('execute', { action: { kind: 'navigation', url: 'https://example.com/' } })).ok, true);
  assert.equal(h.calls[0][1].windowId, 1);
});
test('untrusted or independently embedded frames cannot request tabs or execute actions', async () => {
  const h = harness();
  assert.equal(h.send('snapshot', {}, { id: 'other-extension' }), undefined);
  assert.equal((await h.send('snapshot', {}, { tab: { id: 1 } })).ok, false);
  h.session['overlay:1'] = 'legitimate';
  assert.equal((await h.send('snapshot', { token: 'legitimate' }, { tab: { id: 1 } })).ok, true);
  assert.equal((await h.send('snapshot', { token: 'legitimate', tabId: 2 }, { tab: { id: 1 } })).ok, false);
});
test('the shortcut opens an authenticated overlay and falls back on restricted pages', async () => {
  const h = harness();
  h.shortcut('toggle-palette');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.session['overlay:1'], 'test-token');
  assert.equal(h.calls[0][0], 'inject');
  assert.equal(h.calls[1][1], 1); assert.equal(h.calls[1][2].token, 'test-token');
  h.tabs[0].url = 'about:blank'; h.calls.length = 0;
  h.shortcut('toggle-palette');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls[0][0], 'popup');
});
