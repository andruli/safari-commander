#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
xcodebuild -project 'macos/Safari Commander/Safari Commander.xcodeproj' \
  -scheme 'Safari Commander' -configuration Debug \
  -derivedDataPath build/DerivedData CODE_SIGN_IDENTITY=- CODE_SIGNING_ALLOWED=YES build
printf '\nBuilt: %s/build/DerivedData/Build/Products/Debug/Safari Commander.app\n' "$PWD"
