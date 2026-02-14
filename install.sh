#!/bin/bash
#ddev-generated
# Install script for DDEV Agents add-on
# Sets up the devcontainer with PHP and Node.js versions from parent DDEV project

set -e

# ==============================================================================
# Helper Functions
# ==============================================================================

# Read a value from YAML config file
# Usage: yaml_read <file> <key>
yaml_read() {
  local file="$1"
  local key="$2"
  grep -E "^\s*${key}:" "$file" | sed -E 's/.*'"${key}"':[[:space:]]*"?([^"]*)"?/\1/' | xargs
}

# Replace a string in a file (using temporary file for safety)
# Usage: file_replace <file> <old_string> <new_string>
file_replace() {
  local file="$1"
  local old_string="$2"
  local new_string="$3"
  
  if [ ! -f "$file" ]; then
    echo "⚠️  File not found: $file"
    return 1
  fi
  
  sed -i.bak-$$ "s|${old_string}|${new_string}|g" "$file"
  rm -f "${file}.bak-$$"
}

# Replace multiple strings in a file
# Usage: file_replace_multi <file> <pattern1> <replacement1> [<pattern2> <replacement2>] ...
file_replace_multi() {
  local file="$1"
  shift
  
  if [ ! -f "$file" ]; then
    echo "⚠️  File not found: $file"
    return 1
  fi
  
  local sed_args=()
  while [ $# -gt 0 ]; do
    sed_args+=("-e" "s|${1}|${2}|g")
    shift 2
  done
  
  sed -i.bak-$$ "${sed_args[@]}" "$file"
  rm -f "${file}.bak-$$"
}

# ==============================================================================
# Main Installation Script
# ==============================================================================

# Clean up old architecture: Remove docker-compose.agents.yaml from .ddev/ if it exists
# This file is from previous versions where agents was a DDEV service
if [ -f "docker-compose.agents.yaml" ]; then
  echo "🧹 Removing old docker-compose.agents.yaml from .ddev/ (legacy file)"
  rm -f "docker-compose.agents.yaml"
fi

# Get project name and versions from parent DDEV project
PROJECT_NAME=""
PHP_VERSION=""
NODE_VERSION=""

if [ -f "config.yaml" ]; then
  PROJECT_NAME=$(yaml_read "config.yaml" "name")
  PHP_VERSION=$(yaml_read "config.yaml" "php_version")
  NODE_VERSION=$(yaml_read "config.yaml" "nodejs_version")
  
  if [ -n "$PROJECT_NAME" ]; then
    echo "📍 Found project name in .ddev/config.yaml: $PROJECT_NAME"
  fi
  
  if [ -n "$PHP_VERSION" ]; then
    echo "📍 Found PHP version in .ddev/config.yaml: $PHP_VERSION"
    
    if [ -f ".devcontainer/devcontainer.json" ]; then
      file_replace ".devcontainer/devcontainer.json" "__PHP_VERSION__" "$PHP_VERSION"
      echo "✅ Updated devcontainer.json with PHP $PHP_VERSION"
    fi
  else
    echo "⚠️  Could not extract PHP version from .ddev/config.yaml, using default"
  fi
  
  if [ -n "$NODE_VERSION" ]; then
    echo "📍 Found Node.js version in .ddev/config.yaml: $NODE_VERSION"
    
    if [ -f ".devcontainer/devcontainer.json" ]; then
      file_replace ".devcontainer/devcontainer.json" "__NODE_VERSION__" "$NODE_VERSION"
      echo "✅ Updated devcontainer.json with Node.js $NODE_VERSION"
    fi
  else
    echo "⚠️  Could not extract Node.js version from .ddev/config.yaml, using default"
  fi
else
  echo "⚠️  .ddev/config.yaml not found, using default PHP version"
fi

# Update project name in devcontainer.json
if [ -n "$PROJECT_NAME" ] && [ -f ".devcontainer/devcontainer.json" ]; then
  file_replace ".devcontainer/devcontainer.json" "__PROJECT_NAME__" "$PROJECT_NAME"
  echo "✅ Updated devcontainer.json with project name: $PROJECT_NAME"
fi

# Fallback: use directory name if project name not found
if [ -z "$PROJECT_NAME" ]; then
  PROJECT_NAME=$(basename "$(pwd)/..")
fi

# Update devcontainer compose file with actual project values
if [ -n "$PROJECT_NAME" ]; then
  COMPOSE_PROJECT_NAME="ddev-${PROJECT_NAME}"
  
  if [ -f ".agents/devcontainer-compose.yaml" ]; then
    file_replace_multi ".agents/devcontainer-compose.yaml" \
      '\${DDEV_PROJECT}' "$PROJECT_NAME" \
      '\${COMPOSE_PROJECT_NAME}' "$COMPOSE_PROJECT_NAME"
    echo "✅ Updated .agents/devcontainer-compose.yaml with project values"
    echo "   Network: ${COMPOSE_PROJECT_NAME}_default"
  fi
else
  echo "⚠️  Could not determine DDEV project name"
fi

# Ensure web-entrypoint.d scripts are executable
if [ -f "web-entrypoint.d/setup-ssh.sh" ]; then
  chmod +x web-entrypoint.d/setup-ssh.sh
  echo "✅ Made web-entrypoint.d/setup-ssh.sh executable"
fi

# Move devcontainer directory to parent
echo ""
rm -rf ../.devcontainer
mv .devcontainer ..

# Move agents directory to parent
rm -rf ../.agents
mv .agents ..

mkdir -p ../.vscode && cp ../.agents/mcp.json ../.vscode/mcp.json

# Prepare directory for homeadditions SSH (keys generated on devcontainer start)
mkdir -p ../.ddev/homeadditions/.ssh
chmod 700 ../.ddev/homeadditions/.ssh

echo ""
echo "🚀 DDEV Agents installed successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Ensure DDEV is running: ddev start"
echo "  2. Open VS Code and select 'Reopen in Container' (or rebuild if already open)"
echo "  3. VS Code will create the agents container and connect it to your DDEV network"
echo ""
echo "ℹ️  The agents container is managed by VS Code, not DDEV."
echo "ℹ️  It will automatically connect to: ${COMPOSE_PROJECT_NAME}_default network"
echo ""
