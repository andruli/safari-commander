'use strict';
(() => {
  const params = new URLSearchParams(location.search);
  const overlay = params.get('surface') === 'overlay';
  if (overlay) document.documentElement.classList.add('overlay');
  const api = globalThis.browser;
  const search = document.getElementById('search');
  const list = document.getElementById('results');
  const empty = document.getElementById('empty');
  const status = document.getElementById('status');
  let snapshot = { tabs: [], current: {} }, items = [], selected = 0, mode = 'all', busy = false, statusTimer;
  let targetId = params.has('tab') ? Number(params.get('tab')) : undefined;
  const preview = !api?.runtime?.id;

  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    // Only hard-coded local icon paths go through innerHTML.
    svg.innerHTML = CommanderIcons[name] || CommanderIcons.command;
    return svg;
  }
  document.querySelectorAll('[data-icon]').forEach(node => node.append(icon(node.dataset.icon)));
  async function request(type, fields = {}) {
    const response = await api.runtime.sendMessage({ type: 'commander/' + type, tabId: targetId, token: params.get('token'), ...fields });
    if (!response?.ok) throw new Error(response?.error || 'Safari Commander could not connect. Reopen the palette to try again.');
    return response.data;
  }
  function announce(message) { document.getElementById('announcement').textContent = message; }
  function notify(message) {
    clearTimeout(statusTimer); status.textContent = message; status.hidden = false;
    statusTimer = setTimeout(() => { status.hidden = true; }, 4000);
  }
  async function dismiss() {
    if (preview) { notify('Preview · press ⌘K to open Commander in Safari.'); return; }
    if (overlay) await request('dismiss').catch(() => {});
    else window.close();
  }
  function actionLabel(item) {
    if (!item) return 'select';
    if (item.kind === 'tab') return 'switch';
    if (item.kind === 'navigation') return 'open';
    return item.id === 'copy-url' ? 'copy' : 'run';
  }
  function select(index, scroll = true) {
    if (!items.length) { search.removeAttribute('aria-activedescendant'); return; }
    selected = (index + items.length) % items.length;
    list.querySelectorAll('[role="option"]').forEach((node, i) => node.setAttribute('aria-selected', String(i === selected)));
    const option = document.getElementById(`result-${selected}`);
    search.setAttribute('aria-activedescendant', option.id);
    document.getElementById('action-hint').textContent = actionLabel(items[selected]);
    if (scroll) option.scrollIntoView({ block: 'nearest' });
  }
  function render() {
    const previous = items[selected]?.id;
    items = CommanderCore.results(search.value, mode, snapshot);
    list.replaceChildren();
    list.setAttribute('aria-busy', 'false');
    empty.hidden = items.length > 0;
    document.getElementById('tab-count').textContent = `${snapshot.tabs.length} open ${snapshot.tabs.length === 1 ? 'tab' : 'tabs'}`;
    let lastGroup = '';
    items.forEach((item, index) => {
      const group = item.kind === 'tab' ? 'Open Tabs' : item.kind === 'command' ? 'Commands' : 'Go To';
      if (group !== lastGroup) {
        const label = document.createElement('div'); label.className = 'group-label'; label.textContent = group; label.setAttribute('role', 'presentation');
        list.append(label); lastGroup = group;
      }
      const row = document.createElement('div'); row.className = 'result'; row.id = `result-${index}`;
      row.setAttribute('role', 'option'); row.setAttribute('aria-selected', 'false');
      const tile = document.createElement('span'); tile.className = 'result-icon'; tile.setAttribute('aria-hidden', 'true');
      if (item.kind === 'tab' && CommanderCore.hostname(item.url)) {
        tile.classList.add('letter'); tile.textContent = CommanderCore.hostname(item.url).slice(0, 1).toUpperCase();
      } else tile.append(icon(item.icon));
      const copy = document.createElement('span'); copy.className = 'result-copy';
      const title = document.createElement('span'); title.className = 'result-title'; title.textContent = item.title;
      const detail = document.createElement('span'); detail.className = 'result-detail';
      detail.textContent = item.detail + (item.private ? ' · Private' : '');
      copy.append(title, detail);
      const accessory = document.createElement('span'); accessory.className = 'result-accessory'; accessory.setAttribute('aria-hidden', 'true');
      if (item.current) { const badge = document.createElement('span'); badge.className = 'current-badge'; badge.textContent = 'Current'; accessory.append(badge); }
      else if (item.shortcut) accessory.textContent = item.shortcut;
      else accessory.append(icon(item.kind === 'tab' ? 'return' : item.icon === 'search' ? 'search' : 'return'));
      row.append(tile, copy, accessory);
      row.addEventListener('pointermove', event => { if (event.movementX || event.movementY) select(index, false); });
      // Keep focus in the combobox so typing works immediately after a click.
      row.addEventListener('mousedown', event => event.preventDefault());
      row.addEventListener('click', () => { select(index, false); void execute(); });
      list.append(row);
    });
    selected = Math.max(0, items.findIndex(item => item.id === previous));
    select(selected, false);
    announce(`${items.length} ${items.length === 1 ? 'result' : 'results'}`);
  }
  async function execute(newTab = false) {
    const item = items[selected];
    if (!item || busy) return;
    if (preview) { notify(`Preview · ${item.title}`); return; }
    busy = true;
    try {
      if (item.id === 'copy-url') {
        await navigator.clipboard.writeText(snapshot.current.url);
        notify('Page URL copied');
        setTimeout(() => void dismiss(), 450);
      } else {
        const action = newTab && item.kind === 'tab' && /^https?:\/\//i.test(item.url || '') ? { kind: 'navigation', url: item.url } : item;
        await request('execute', { action });
        await dismiss();
      }
    } catch (error) { notify(error.message || 'Safari could not complete that action.'); }
    finally { busy = false; }
  }
  function setMode(next) {
    mode = next; selected = 0;
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    search.placeholder = mode === 'tabs' ? 'Find an open tab…' : mode === 'commands' ? 'Type a command…' : 'Search tabs or type a command…';
    render(); search.focus();
  }
  search.addEventListener('input', () => { selected = 0; render(); list.parentElement.scrollTop = 0; });
  document.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'Escape') { event.preventDefault(); void dismiss(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); select(selected + (event.key === 'ArrowDown' ? 1 : -1)); search.focus(); }
    else if (event.key === 'Enter' && document.activeElement === search) { event.preventDefault(); void execute(event.metaKey); }
    else if (event.ctrlKey && event.key === 'Tab') {
      event.preventDefault(); const scopes = ['all', 'tabs', 'commands']; setMode(scopes[(scopes.indexOf(mode) + (event.shiftKey ? 2 : 1)) % 3]);
    }
  });
  document.getElementById('dismiss').addEventListener('click', () => void dismiss());
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));

  async function refresh() {
    if (!api?.runtime?.id) {
      // Preview data is supplied by a separate development-only script.
      snapshot = globalThis.CommanderPreview || { tabs: [], current: {} };
    } else {
      snapshot = await request('snapshot'); targetId = snapshot.current.id;
    }
    render();
  }
  refresh().catch(error => {
    list.setAttribute('aria-busy', 'false'); empty.hidden = false;
    document.getElementById('empty-title').textContent = 'Couldn’t read your tabs';
    document.getElementById('empty-detail').textContent = 'Check Commander’s website access in Safari Settings.';
    notify(error.message);
  });
  search.focus();
  window.addEventListener('focus', () => search.focus());
  api?.tabs?.onUpdated?.addListener(() => void refresh().catch(() => {}));
  api?.tabs?.onRemoved?.addListener(() => void refresh().catch(() => {}));
})();
