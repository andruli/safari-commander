(() => {
  'use strict';
  // On-demand injection may run more than once in the same document.
  if (globalThis.__safariCommanderInstalled) return;
  globalThis.__safariCommanderInstalled = true;
  let host, dialog, frame, previousFocus;
  function hide() {
    if (!host) return;
    dialog.close(); host.remove(); host = dialog = frame = null;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function show(tabId, token) {
    previousFocus = document.activeElement;
    host = document.createElement('safari-commander');
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial !important; }
      dialog { border:0; padding:0; margin: min(16vh, 140px) auto 0; width:min(640px, calc(100vw - 40px));
        max-width:none; max-height:calc(100vh - 40px); overflow:visible; background:transparent; color-scheme:light dark;
        border-radius:16px; box-shadow:0 24px 80px #0005, 0 4px 20px #0002; }
      dialog::backdrop { background:rgba(20,20,24,.16); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); }
      iframe { display:block; border:0; width:100%; height:min(484px, calc(84vh - 30px)); border-radius:16px; color-scheme:light dark; }
      @media (prefers-reduced-motion:no-preference) { dialog { animation:arrive .15s ease-out; }
        @keyframes arrive { from { opacity:0; transform:translateY(-5px) scale(.99) } to { opacity:1; transform:none } } }
      @media (prefers-reduced-transparency:reduce) { dialog::backdrop { backdrop-filter:none; -webkit-backdrop-filter:none; } }
    `;
    dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', 'Safari Commander');
    frame = document.createElement('iframe');
    frame.src = browser.runtime.getURL(`palette.html?surface=overlay&tab=${tabId}&token=${encodeURIComponent(token)}`);
    frame.title = 'Safari Commander command palette';
    frame.allow = 'clipboard-write';
    dialog.append(frame); shadow.append(style, dialog); document.documentElement.append(host);
    dialog.addEventListener('cancel', event => { event.preventDefault(); hide(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) hide(); });
    dialog.showModal();
    frame.addEventListener('load', () => frame?.focus());
  }
  browser.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== browser.runtime.id) return;
    if (message.type === 'commander/toggle') { host ? hide() : show(message.tabId, message.token); return Promise.resolve({ visible: !!host }); }
    if (message.type === 'commander/hide') { hide(); return Promise.resolve({}); }
  });
})();
