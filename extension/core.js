/* Shared, dependency-free search model. Runs in Safari and Node. */
(function (root) {
  'use strict';
  const COMMANDS = [
    { id: 'new-tab', title: 'New Tab', detail: 'Start somewhere new', icon: 'plus', aliases: 'open create tab', shortcut: '⌘T' },
    { id: 'copy-url', title: 'Copy Page URL', detail: 'Copy the current address', icon: 'link', aliases: 'copy link address clipboard' },
    { id: 'reload', title: 'Reload Page', detail: 'Refresh the current tab', icon: 'reload', aliases: 'refresh reload page', shortcut: '⌘R' },
    { id: 'duplicate', title: 'Duplicate Tab', detail: 'Open another copy of this page', icon: 'duplicate', aliases: 'clone duplicate tab' },
    { id: 'mute', title: 'Mute Tab', detail: 'Turn off sound in this tab', icon: 'speaker', aliases: 'mute unmute audio sound quiet' },
    { id: 'new-window', title: 'New Window', detail: 'Open a fresh Safari window', icon: 'window', aliases: 'new create window', shortcut: '⌘N' },
    { id: 'close-tab', title: 'Close Tab', detail: 'Close the current tab', icon: 'close', aliases: 'close remove tab', shortcut: '⌘W' }
  ];
  function normalize(value) { return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function score(query, value) {
    query = normalize(query).trim(); value = normalize(value);
    if (!query) return 1;
    if (value === query) return 1000;
    if (value.startsWith(query)) return 800 - Math.min(value.length, 150);
    const index = value.indexOf(query);
    if (index >= 0) return 600 - index;
    // Match every word; do not let a partial phrase hide better results.
    if (query.includes(' ')) {
      const scores = query.split(/\s+/).map(part => score(part, value));
      return scores.every(s => s > 0) ? Math.min(...scores) : 0;
    }
    const initials = value.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(word => word[0]).join('');
    if (initials.startsWith(query) && query.length > 1) return 450 - initials.length;
    let position = 0, first = -1, last = -1;
    for (const letter of query) {
      const next = value.indexOf(letter, position);
      if (next < 0) return 0;
      if (first < 0) first = next;
      last = next; position = next + 1;
    }
    const span = last - first + 1;
    // Sparse coincidences in long URLs are not useful fuzzy matches.
    return span <= query.length * 3 ? 200 - span - first : 0;
  }
  function hostname(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }
  function navigation(input) {
    const query = input.trim();
    if (!query) return null;
    const aliases = {
      yt: ['YouTube', 'https://www.youtube.com/results?search_query='],
      gh: ['GitHub', 'https://github.com/search?q='],
      w: ['Wikipedia', 'https://en.wikipedia.org/w/index.php?search=']
    };
    const match = query.match(/^(yt|gh|w)\s+(.+)$/i);
    if (match) {
      const [name, base] = aliases[match[1].toLowerCase()];
      return { id: 'navigate', kind: 'navigation', title: `Search ${name} for “${match[2]}”`, detail: name, url: base + encodeURIComponent(match[2]), icon: 'search' };
    }
    // Never interpret executable or privileged URL schemes as navigation.
    if (/^[a-z][a-z\d+.-]*:/i.test(query) && !/^https?:\/\//i.test(query) && !/^localhost:\d+/i.test(query)) return null;
    const looksLikeURL = /^https?:\/\//i.test(query) || /^(localhost|(?:[\p{L}\d-]+\.)+[\p{L}\d-]{2,})(:\d+)?([/?#]|$)/u.test(query);
    if (looksLikeURL && !/\s/.test(query)) {
      try {
        const url = new URL(/^https?:\/\//i.test(query) ? query : `https://${query}`);
        if (url.username || url.password || !url.hostname) return null;
        return { id: 'navigate', kind: 'navigation', title: `Open ${query}`, detail: 'Open in a new tab', url: url.href, icon: 'globe' };
      } catch { /* Fall through to a web search. */ }
    }
    return { id: 'navigate', kind: 'navigation', title: `Search the web for “${query}”`, detail: 'DuckDuckGo · new tab', url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, icon: 'search' };
  }
  function results(input, mode, snapshot) {
    let query = input.trim();
    if (query.startsWith('>')) { mode = 'commands'; query = query.slice(1).trim(); }
    if (query.startsWith('@')) { mode = 'tabs'; query = query.slice(1).trim(); }
    const current = snapshot.current || {};
    const tabs = (snapshot.tabs || []).map(tab => ({
      id: `tab-${tab.id}`, tabId: tab.id, kind: 'tab', title: tab.title || hostname(tab.url) || 'Untitled Tab',
      detail: hostname(tab.url) || 'Safari', url: tab.url, current: tab.id === current.id,
      private: !!tab.incognito, icon: 'globe', lastAccessed: tab.lastAccessed || 0,
      windowId: tab.windowId,
      score: Math.max(score(query, tab.title), score(query, tab.url))
    })).filter(tab => !query || tab.score > 0).sort((a, b) =>
      query ? b.score - a.score || b.lastAccessed - a.lastAccessed : Number(a.current) - Number(b.current) || b.lastAccessed - a.lastAccessed
    );
    const commands = COMMANDS.map(command => ({ ...command, kind: 'command',
      title: command.id === 'mute' && current.mutedInfo?.muted ? 'Unmute Tab' : command.title,
      score: Math.max(score(query, command.title), score(query, command.aliases))
    })).filter(command => (!query || command.score > 0) && (command.id !== 'copy-url' || /^https?:\/\//i.test(current.url || '')))
      .sort((a, b) => query ? b.score - a.score : 0);
    if (mode === 'tabs') return tabs.slice(0, 30);
    if (mode === 'commands') return commands;
    const nav = navigation(query);
    if (!query) return [...tabs.slice(0, 3), ...commands.slice(0, 2)];
    const ranked = [...tabs, ...commands].sort((a, b) => b.score - a.score).slice(0, 12);
    return nav ? (ranked.length && ranked[0].score >= 500 ? [...ranked, nav] : [nav, ...ranked]) : ranked;
  }
  const api = { COMMANDS, score, hostname, navigation, results };
  root.CommanderCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
