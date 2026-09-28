#!/bin/bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_dir"
mkdir -p .build/module-cache .build/clang-cache
export CLANG_MODULE_CACHE_PATH="$project_dir/.build/clang-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$project_dir/.build/module-cache"
# Some Command Line Tools releases ship Testing but omit its framework search path.
developer_dir="$(xcode-select -p)"
testing_frameworks="$developer_dir/Library/Developer/Frameworks"
test_flags=()
if [[ -d "$testing_frameworks/Testing.framework" ]]; then
  test_flags+=(-Xswiftc -F -Xswiftc "$testing_frameworks")
  test_flags+=(-Xlinker -rpath -Xlinker "$testing_frameworks")
  test_flags+=(-Xlinker -rpath -Xlinker "$developer_dir/Library/Developer/usr/lib")
  testing_plugins="$developer_dir/usr/lib/swift/host/plugins/testing"
  if [[ -d "$testing_plugins" ]]; then
    test_flags+=(-Xswiftc -plugin-path -Xswiftc "$testing_plugins")
  fi
fi
swift test --disable-sandbox --disable-xctest --enable-swift-testing --cache-path .build/swiftpm-cache --config-path .build/swiftpm-config --security-path .build/swiftpm-security "${test_flags[@]}" "$@"
