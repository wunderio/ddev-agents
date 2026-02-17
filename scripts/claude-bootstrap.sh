#!/usr/bin/env bash
# #ddev-generated
set -euo pipefail

echo "Installing Claude Code..."

# Install via official native installer
curl -fsSL https://claude.ai/install.sh | bash

# Verify
if command -v /home/vscode/.local/bin/claude >/dev/null 2>&1; then
  echo "Installed: $(/home/vscode/.local/bin/claude --version 2>/dev/null || echo 'unknown version')"
else
  echo "Error: Installation failed."
  exit 1
fi

cat <<'EOF'

Claude Code installed successfully.

Next steps:
  1. Run: ddev claude login
     Sign in with your company Claude for Teams account.
  2. Verify auth: ddev claude /status
     Confirm authentication shows Teams (not API key).

EOF
