#!/bin/bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_dir"
configuration="${1:-release}"
if [[ "$configuration" != "release" && "$configuration" != "debug" ]]; then
  echo "Usage: $0 [release|debug]" >&2
  exit 2
fi
mkdir -p .build/module-cache .build/clang-cache
export CLANG_MODULE_CACHE_PATH="$project_dir/.build/clang-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$project_dir/.build/module-cache"
swift build --disable-sandbox --cache-path .build/swiftpm-cache --config-path .build/swiftpm-config --security-path .build/swiftpm-security -c "$configuration"
bin_dir="$(swift build --disable-sandbox -c "$configuration" --show-bin-path)"
app_dir="$project_dir/build/QuizFlash.app"
mkdir -p "$app_dir/Contents/MacOS" "$app_dir/Contents/Resources"
cp "$bin_dir/QuizFlash" "$app_dir/Contents/MacOS/QuizFlash"
cp Resources/Info.plist "$app_dir/Contents/Info.plist"
/usr/bin/codesign --force --sign - --identifier com.quizflash.app "$app_dir"
/usr/bin/codesign --verify --strict "$app_dir"
echo "Build success: $app_dir"
