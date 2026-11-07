const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../extension');
const preview = {
  current: { id: 1, title: 'Apple Developer', url: 'https://developer.apple.com/', windowId: 1 },
  tabs: [
    { id: 1, title: 'Apple Developer', url: 'https://developer.apple.com/', windowId: 1 },
    { id: 2, title: 'Safari Commander — Design notes', url: 'https://www.icloud.com/notes', windowId: 1, lastAccessed: 10 },
    { id: 3, title: 'Human Interface Guidelines', url: 'https://developer.apple.com/design/human-interface-guidelines', windowId: 1, lastAccessed: 9 },
    { id: 4, title: 'WebKit — Building a better web', url: 'https://webkit.org/', windowId: 1, lastAccessed: 8 },
    { id: 5, title: 'Safari Commander · GitHub', url: 'https://github.com/andruli/safari-commander', windowId: 1, lastAccessed: 7 }
  ]
};
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
http.createServer((req, res) => {
  const requestURL = new URL(req.url, 'http://localhost');
  const pathname = requestURL.pathname;
  const theme = requestURL.searchParams.get('theme');
  const file = path.resolve(root, '.' + (pathname === '/' ? '/palette.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    if (file.endsWith('palette.html')) {
      const script = `<script>globalThis.CommanderPreview=${JSON.stringify(preview)}</script>`;
      data = Buffer.from(data.toString().replace('<script src="core.js"', script + '<script src="core.js"').replace('href="palette.css"', `href="palette.css?theme=${theme || ''}"`));
    }
    if (file.endsWith('palette.css') && ['light', 'dark'].includes(theme)) {
      data = Buffer.from(data.toString().replaceAll('@media (prefers-color-scheme: dark)', theme === 'dark' ? '@media all' : '@media not all') + `\n:root { color-scheme: ${theme}; }`);
    }
    res.end(data);
  });
}).listen(4173, '127.0.0.1', () => console.log('Commander preview: http://127.0.0.1:4173 (sample tabs; actions are simulated)'));
