#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Building the extension..."
npm run build

echo "Setup complete. The built extension is in the 'dist' folder."
