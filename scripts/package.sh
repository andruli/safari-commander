#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run check
mkdir -p build
python3 - <<'PY'
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path('extension')
with ZipFile('build/Safari-Commander-extension.zip', 'w', ZIP_DEFLATED) as archive:
    for file in sorted(root.rglob('*')):
        if file.is_file() and not file.name.startswith('.'):
            archive.write(file, file.relative_to(root))
print('Created build/Safari-Commander-extension.zip')
PY
