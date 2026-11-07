const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'extension/manifest.json')));
for (const file of fs.readdirSync(path.join(root, 'extension')).filter(file => file.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', path.join(root, 'extension', file)]);
}
const resources = [...manifest.background.scripts, manifest.action.default_popup,
  ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon),
  ...manifest.web_accessible_resources.flatMap(entry => entry.resources), 'content.js'];
for (const file of resources) {
  if (!fs.existsSync(path.join(root, 'extension', file))) throw Error(`Missing manifest resource: ${file}`);
}
if (manifest.commands['toggle-palette'].suggested_key.mac !== 'Command+K') throw Error('Expected ⌘K shortcut');
console.log('JavaScript syntax, manifest resources, and ⌘K shortcut: OK');
