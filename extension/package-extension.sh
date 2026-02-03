#!/bin/bash
# Package Think Social Chrome Extension for distribution

set -e

echo "Building extension..."
npm run build

echo "Creating distribution package..."
mkdir -p ../dist

# Create a clean directory for packaging
rm -rf ../dist/think-social-extension
mkdir -p ../dist/think-social-extension

# Copy necessary files
cp manifest.json ../dist/think-social-extension/
cp popup.html ../dist/think-social-extension/
cp styles.css ../dist/think-social-extension/
cp -r dist ../dist/think-social-extension/
cp -r icons ../dist/think-social-extension/

# Create zip file
cd ../dist
rm -f think-social-extension.zip
zip -r think-social-extension.zip think-social-extension

echo ""
echo "✅ Extension packaged successfully!"
echo "📦 Output: dist/think-social-extension.zip"
echo ""
echo "To install:"
echo "1. Go to chrome://extensions/"
echo "2. Enable 'Developer mode'"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'dist/think-social-extension' folder"
echo ""
echo "Or upload the .zip file to the Chrome Web Store"
