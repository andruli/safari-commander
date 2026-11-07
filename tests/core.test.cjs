const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../extension/core.js');
const snapshot = {
  current: { id: 1, url: 'https://apple.com', mutedInfo: { muted: true } },
  tabs: [
    { id: 1, title: 'Apple', url: 'https://apple.com' },
    { id: 2, title: 'Human Interface Guidelines', url: 'https://developer.apple.com/design', lastAccessed: 9 },
    { id: 3, title: 'GitHub', url: 'https://github.com', lastAccessed: 8 }
  ]
};
test('tab search handles fuzzy names, accents, URLs, and multiword queries', () => {
  assert.equal(core.results('hig', 'tabs', snapshot)[0].tabId, 2);
  assert.equal(core.results('human guide', 'tabs', snapshot)[0].tabId, 2);
  assert.equal(core.results('github.com', 'tabs', snapshot)[0].tabId, 3);
  assert.ok(core.score('cafe', 'Café') > 0);
  assert.equal(core.results('zzzzzz', 'tabs', snapshot).length, 0);
});
test('recent tabs precede the current tab and command aliases work', () => {
  assert.equal(core.results('', 'tabs', snapshot)[0].tabId, 2);
  assert.equal(core.results('> refresh', 'all', snapshot)[0].id, 'reload');
  assert.ok(core.results('@ github', 'all', snapshot).every(item => item.kind === 'tab'));
  assert.equal(core.results('mute', 'commands', snapshot)[0].title, 'Unmute Tab');
});
test('navigation encodes searches and rejects privileged or credential-bearing URLs', () => {
  assert.equal(core.navigation('example.com/path').url, 'https://example.com/path');
  assert.equal(core.navigation('yt cats & dogs').url, 'https://www.youtube.com/results?search_query=cats%20%26%20dogs');
  assert.equal(core.navigation('hello world').url, 'https://duckduckgo.com/?q=hello%20world');
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,hi', 'https://name:secret@example.com']) assert.equal(core.navigation(url), null);
});
test('matching open tabs rank before web search; unmatched queries retain a search action', () => {
  assert.equal(core.results('github', 'all', snapshot)[0].kind, 'tab');
  assert.equal(core.results('weather tomorrow', 'all', snapshot)[0].kind, 'navigation');
});
