#!/bin/bash

# pyLoad Extension Packaging Script
# This script creates a clean ZIP file for submission to Mozilla Add-on Hub.

OUTPUT_FILE="pyload-extension.zip"

# Clean up previous build
rm -f "$OUTPUT_FILE"

echo "📦 Packaging extension..."

# Create the ZIP file
# We exclude development-only files and documentation
zip -r "$OUTPUT_FILE" \
    manifest.json \
    background.js \
    popup.html \
    popup.js \
    options.html \
    options.js \
    style.css \
    icons/ \
    -x "*.DS_Store*" "*BUILD.md*" "*package.sh*" "*implementation_plan.md*" "*task.md*" "*walkthrough.md*"

echo "✅ Build complete: $OUTPUT_FILE"
echo "🚀 You can now upload this file to https://addons.mozilla.org/developers/"
