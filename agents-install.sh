#!/bin/bash
#ddev-generated
# Install script for DDEV Agents add-on
# Sets up the devcontainer with PHP and Node versions from parent DDEV project

set -e

# Get PHP version from parent DDEV project
if [ -f "../.ddev/config.yaml" ]; then
  PHP_VERSION=$(grep -E '^\s*php_version:' ../.ddev/config.yaml | sed -E 's/.*php_version:[[:space:]]*"?([^"]*)"?/\1/' | xargs)
  NODE_VERSION=$(grep -E '^\s*nodejs_version:' ../.ddev/config.yaml | sed -E 's/.*nodejs_version:[[:space:]]*"?([^"]*)"?/\1/' | xargs)
  
  if [ -n "$PHP_VERSION" ]; then
    echo "📍 Found PHP version in .ddev/config.yaml: $PHP_VERSION"
    
    # Update devcontainer.json with the PHP version
    # Note: .devcontainer is currently in the same directory as agents-install.sh during installation
    if [ -f ".devcontainer/devcontainer.json" ]; then
      # Create a temporary file
      TMP_FILE=$(mktemp)

      # Update the PHP version in the JSON (specifically within the PHP feature)
      # We look for the "version": "... " line that follows the php feature key
      sed -E '/"ghcr.io\/devcontainers\/features\/php:1": \{/,/\}/ s/"version": "[^"]*"/"version": "'$PHP_VERSION'"/' .devcontainer/devcontainer.json > "$TMP_FILE"

      # Replace the original file
      mv "$TMP_FILE" .devcontainer/devcontainer.json

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
    TMP_FILE=$(mktemp)

    # Update the Node version in the JSON (specifically within the Node feature)
    sed -E '/"ghcr.io\/devcontainers\/features\/node:1": \{/,/\}/ s/"version": "[^"]*"/"version": "'$NODE_VERSION'"/' .devcontainer/devcontainer.json > "$TMP_FILE"

    # If the Node feature was empty, inject a version entry
    if ! grep -qE '"ghcr.io/devcontainers/features/node:1": \{[^}]*"version"' "$TMP_FILE"; then
      TMP_FILE_2=$(mktemp)
      sed -E 's/"ghcr.io\/devcontainers\/features\/node:1": \{\}/"ghcr.io\/devcontainers\/features\/node:1": {\
      "version": "'$NODE_VERSION'"\
    }/' "$TMP_FILE" > "$TMP_FILE_2"
      mv "$TMP_FILE_2" "$TMP_FILE"
    fi

    mv "$TMP_FILE" .devcontainer/devcontainer.json

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
