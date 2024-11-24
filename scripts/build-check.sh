#!/bin/bash
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "TypeScript version: $(npx tsc -v)"
echo "Vite version: $(npx vite --version)"

echo "Checking for type definitions..."
ls -la node_modules/@types
ls -la node_modules/vite

echo "Checking environment variables..."
printenv | grep VITE_ 