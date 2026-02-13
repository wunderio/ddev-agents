#!/bin/bash
#ddev-generated
# Install script for DDEV Agents add-on
# Sets up the devcontainer with PHP and Node versions from parent DDEV project

set -e

# Get PHP version from parent DDEV project
if [ -f "../.ddev/config.yaml" ]; then
  PHP_VERSION=$(grep -E '^\s*php_version:' ../.ddev/config.yaml | sed -E 's/^[[:space:]]*php_version:[[:space:]]*"?([^"[:space:]#]+).*/\1/' | xargs)
  NODE_VERSION=$(grep -E '^\s*nodejs_version:' ../.ddev/config.yaml | sed -E 's/^[[:space:]]*nodejs_version:[[:space:]]*"?([^"[:space:]#]+).*/\1/' | xargs)
  
  if [ -n "$PHP_VERSION" ]; then
    echo "📍 Found PHP version in .ddev/config.yaml: $PHP_VERSION"
    
    # Update devcontainer.json with the PHP version
    # Note: .devcontainer is currently in the same directory as agents-install.sh during installation
    if [ -f ".devcontainer/devcontainer.json" ]; then
      # Use awk to precisely update only the PHP feature's version
      awk -v ver="$PHP_VERSION" '
        /"ghcr\.io\/devcontainers\/features\/php:1":/ { in_php=1 }
        in_php && /"version":/ { sub(/"version": "[^"]*"/, "\"version\": \"" ver "\""); in_php=0 }
        { print }
      ' .devcontainer/devcontainer.json > .devcontainer/devcontainer.json.tmp
      mv .devcontainer/devcontainer.json.tmp .devcontainer/devcontainer.json

      echo "✅ Updated devcontainer.json with PHP $PHP_VERSION"
    fi
  else
    echo "⚠️  Could not extract PHP version from .ddev/config.yaml, using default"
  fi
else
  echo "⚠️  .ddev/config.yaml not found, using default PHP version"
fi

# Update devcontainer.json with the Node version if configured
if [ -n "$NODE_VERSION" ]; then
  echo "📍 Found Node version in .ddev/config.yaml: $NODE_VERSION"

  if [ -f ".devcontainer/devcontainer.json" ]; then
    # Update Node version using awk to target only the Node feature
    awk -v ver="$NODE_VERSION" '
      /"ghcr\.io\/devcontainers\/features\/node:1":/ { in_node=1 }
      in_node && /"version":/ { sub(/"version": "[^"]*"/, "\"version\": \"" ver "\""); in_node=0 }
      { print }
    ' .devcontainer/devcontainer.json > .devcontainer/devcontainer.json.tmp
    mv .devcontainer/devcontainer.json.tmp .devcontainer/devcontainer.json

    echo "✅ Updated devcontainer.json with Node $NODE_VERSION"
  fi
else
  echo "⚠️  Could not extract Node version from .ddev/config.yaml, using default"
fi

# Move devcontainer directory to parent
echo ""
rm -rf ../.devcontainer
mv .devcontainer ..

echo "🚀 DDEV Agents installed."
echo "👉 Run 'ddev restart' to build the Agents container."
echo "👉 Then reopen VS Code in the Container."
