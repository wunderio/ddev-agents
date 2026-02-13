#!/bin/bash
# Install script for DDEV Agents add-on
# Sets up the devcontainer with PHP version from parent DDEV project

set -e

# Get project name and PHP version from parent DDEV project
PROJECT_NAME=""
PHP_VERSION=""

if [ -f "config.yaml" ]; then
  PROJECT_NAME=$(grep -E '^\s*name:' config.yaml | sed -E 's/.*name:[[:space:]]*"?([^"]*)"?/\1/' | xargs)
  PHP_VERSION=$(grep -E '^\s*php_version:' config.yaml | sed -E 's/.*php_version:[[:space:]]*"?([^"]*)"?/\1/' | xargs)
  
  if [ -n "$PROJECT_NAME" ]; then
    echo "📍 Found project name in .ddev/config.yaml: $PROJECT_NAME"
  fi
  
  if [ -n "$PHP_VERSION" ]; then
    echo "📍 Found PHP version in .ddev/config.yaml: $PHP_VERSION"
    
    # Update devcontainer.json with the PHP version
    # Note: .devcontainer is currently in the same directory as install.sh during installation
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
    
    # Update environment variables with project name if found
    if [ -n "$PROJECT_NAME" ]; then
      TMP_FILE=$(mktemp)
      COMPOSE_PROJECT_NAME="ddev-${PROJECT_NAME}"
      
      # Update containerEnv and remoteEnv with DDEV_PROJECT and COMPOSE_PROJECT_NAME
      jq --arg ddev_proj "$PROJECT_NAME" --arg compose_proj "$COMPOSE_PROJECT_NAME" \
        '.containerEnv.DDEV_PROJECT = $ddev_proj | 
         .containerEnv.COMPOSE_PROJECT_NAME = $compose_proj |
         .remoteEnv.DDEV_PROJECT = $ddev_proj | 
         .remoteEnv.COMPOSE_PROJECT_NAME = $compose_proj' \
        .devcontainer/devcontainer.json > "$TMP_FILE"
      
      mv "$TMP_FILE" .devcontainer/devcontainer.json
      
      echo "✅ Updated devcontainer.json with DDEV_PROJECT=$PROJECT_NAME and COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME"
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
