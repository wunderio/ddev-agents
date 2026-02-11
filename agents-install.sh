#!/bin/bash
# Install script for DDEV Agents add-on
# Sets up the devcontainer with PHP version from parent DDEV project

set -e

# Get PHP version from parent DDEV project
if [ -f "config.yaml" ]; then
  PHP_VERSION=$(grep -E '^\s*php_version:' config.yaml | sed -E 's/.*php_version:[[:space:]]*"?([^"]*)"?/\1/' | xargs)
  
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

# Move devcontainer directory to parent
echo ""
rm -rf ../.devcontainer
mv .devcontainer ..

echo "🚀 DDEV Agents installed."
echo "👉 Run 'ddev restart' to build the Agents container."
echo "👉 Then reopen VS Code in the Container."
