#!/bin/bash

# Exit on any error
set -e

echo "Building YouTube Auto-Scroll WASM..."

# Build for web target and output into extension/pkg
wasm-pack build --target web --out-dir extension/pkg

# Optional: Minify/clean up (wasm-pack does some of this)
# rm -rf extension/pkg/.gitignore extension/pkg/package.json extension/pkg/README.md

echo "Build complete! Load the 'extension' directory as an unpacked extension in Chrome."
