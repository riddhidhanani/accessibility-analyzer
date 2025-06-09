#!/usr/bin/env bash
echo "Installing Chromium from Puppeteer..."
if [ -f node_modules/puppeteer/install.js ]; then
  node node_modules/puppeteer/install.js
else
  echo "⚠️ Puppeteer install.js not found! Make sure it's in package.json."
  exit 1
fi
