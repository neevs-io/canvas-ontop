#!/bin/bash

# Canvas On Top - Chrome Web Store packaging script
# This script creates a ZIP file ready for submission to the Chrome Web Store

# Exit on any error
set -e

echo "🔍 Checking for required build..."
if [ ! -d "dist" ]; then
  echo "❌ Error: 'dist' directory not found. Run 'npm run build' first."
  exit 1
fi

echo "🧹 Cleaning up any previous package..."
rm -f canvas-on-top.zip

echo "📦 Creating package for Chrome Web Store submission..."
cd dist
zip -r ../canvas-on-top.zip ./*
cd ..

echo "✅ Package created: canvas-on-top.zip"
echo "📏 Package size: $(du -h canvas-on-top.zip | cut -f1)"

echo "
✨ Next steps:
1. Go to https://chrome.google.com/webstore/devconsole/
2. Create a new item
3. Upload canvas-on-top.zip
4. Fill in store listing information from CHROME_WEB_STORE_LISTING.md
5. Submit for review
"

# Make this script executable with: chmod +x package-for-store.sh