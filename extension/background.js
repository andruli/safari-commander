'use strict';
const api = browser;
const protocol = 'commander/';

async function activeTab() {
  const [tab] = await api.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) throw new Error('Open a Safari window to get started.');
  return tab;
}

async function showPalette() {
  try {
    const tab = await activeTab();
    if (!/^https?:\/\//i.test(tab.url || '')) throw new Error('Safari page');
    await api.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    const token = crypto.randomUUID();
    await api.storage.session.set({ [`overlay:${tab.id}`]: token });
    await api.tabs.sendMessage(tab.id, { type: protocol + 'toggle', tabId: tab.id, token });
  } catch {
    // Start Page, PDFs, restricted pages, or denied website access.
    try { await api.action.openPopup(); } catch (error) { console.warn('Open Commander with its toolbar button.', error); }
  }
}
api.commands.onCommand.addListener(command => { if (command === 'toggle-palette') void showPalette(); });

async function targetTab(id) {
  return Number.isInteger(id) ? api.tabs.get(id) : activeTab();
}
async function handle(message, sender) {
  if (message.type === protocol + 'snapshot') {
    const current = await targetTab(message.tabId);
    const tabs = await api.tabs.query({});
    const recency = await api.storage.session.get('recency');
    for (const tab of tabs) tab.lastAccessed = recency.recency?.[tab.id] || tab.lastAccessed || 0;
    // Never mix private and regular browsing in the palette.
    return { current, tabs: tabs.filter(tab => !!tab.incognito === !!current.incognito) };
  }
  if (message.type === protocol + 'dismiss') {
    const tab = await targetTab(message.tabId ?? sender.tab?.id);
    try { await api.tabs.sendMessage(tab.id, { type: protocol + 'hide' }); } catch { /* Popup has no overlay. */ }
    return {};
  }
  if (message.type !== protocol + 'execute') throw new Error('Unknown request.');
  const tab = await targetTab(message.tabId);
  const action = message.action;
  if (action.kind === 'tab') {
    const destination = await api.tabs.get(action.tabId);
    if (!!destination.incognito !== !!tab.incognito) throw new Error('This tab belongs to another browsing session.');
    await api.tabs.update(destination.id, { active: true });
    await api.windows.update(destination.windowId, { focused: true });
  } else if (action.kind === 'navigation') {
    const url = new URL(action.url);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an http or https address.');
    await api.tabs.create({ windowId: tab.windowId, url: url.href, active: true });
  } else if (action.kind === 'command') {
    switch (action.id) {
      case 'new-tab': await api.tabs.create({ windowId: tab.windowId, active: true }); break;
      case 'new-window': await api.windows.create({ incognito: !!tab.incognito }); break;
      case 'reload': await api.tabs.reload(tab.id); break;
      case 'duplicate': await api.tabs.duplicate(tab.id); break;
      case 'mute': await api.tabs.update(tab.id, { muted: !tab.mutedInfo?.muted }); break;
      case 'close-tab': await api.tabs.remove(tab.id); break;
      default: throw new Error('That command is unavailable.');
    }
  } else throw new Error('That action is unavailable.');
  return {};
}
api.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== api.runtime.id || !message?.type?.startsWith(protocol)) return;
  return authorize(message, sender).then(() => handle(message, sender)).then(data => ({ ok: true, data }), error => ({ ok: false, error: error.message || 'Safari could not complete that action.' }));
});

// Web-accessible UI may only act inside the frame opened by our content script.
// A page that independently embeds palette.html cannot read tabs or run commands.
async function authorize(message, sender) {
  const senderURL = new URL(sender.url || api.runtime.getURL('palette.html'));
  if (senderURL.pathname !== '/palette.html') throw new Error('Unknown Commander surface.');
  if (!sender.tab) return; // Browser-owned toolbar popup.
  const key = `overlay:${sender.tab.id}`;
  const session = await api.storage.session.get(key);
  if (!message.token || session[key] !== message.token || message.tabId !== sender.tab.id) {
    throw new Error('Reopen Commander with ⌘K to connect this palette.');
  }
}
api.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const data = await api.storage.session.get('recency');
    await api.storage.session.set({ recency: { ...data.recency, [tabId]: Date.now() } });
  } catch { /* Tab ordering can fall back to Safari’s own timestamps. */ }
});
api.tabs.onRemoved.addListener(async tabId => {
  try {
    const data = await api.storage.session.get('recency');
    const recency = data.recency || {}; delete recency[tabId];
    await api.storage.session.set({ recency });
    await api.storage.session.remove(`overlay:${tabId}`);
  } catch { /* Session storage is ephemeral. */ }
});
