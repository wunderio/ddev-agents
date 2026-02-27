#!/bin/bash
set -e

REMOTE_USER="${_REMOTE_USER:-vscode}"
REMOTE_USER_HOME="${_REMOTE_USER_HOME:-/home/$REMOTE_USER}"

echo "Installing Claude Code for user: $REMOTE_USER"
su - "$REMOTE_USER" -c "curl -fsSL https://claude.ai/install.sh | bash"

CLAUDE_BIN="$REMOTE_USER_HOME/.local/bin/claude"
if [ -f "$CLAUDE_BIN" ]; then
  echo "Claude Code installed: $($CLAUDE_BIN --version 2>/dev/null || echo 'unknown version')"
else
  echo "Error: Claude Code installation failed — binary not found at $CLAUDE_BIN"
  exit 1
fi

# Pre-install the MCP proxy so it is available offline (npx will find the
# global copy instead of downloading from the registry).
echo "Installing @wunderio/wdrmcp globally..."
npm install -g @wunderio/wdrmcp
echo "wdrmcp installed: $(npm ls -g @wunderio/wdrmcp --depth=0 2>/dev/null || echo 'unknown')"

# Remove any config/state files created during installation.
# Auth and state must live in the Docker volume mounted at runtime,
# not baked into the image — otherwise the symlink setup in ddev claude
# tries to back them up and fails if the volume is not yet chowned.
rm -f "$REMOTE_USER_HOME/.claude.json"
rm -rf "$REMOTE_USER_HOME/.claude"
