#!/usr/bin/env bash
echo "Installing Chromium from Puppeteer..."
if [ -f ./node_modules/puppeteer/install.js ]; then
  node ./node_modules/puppeteer/install.js
else
  echo "⚠️ Puppeteer install.js not found in ./node_modules. Exiting."
  exit 1
fi


