#!/bin/bash
set -e

# Local Development MCP server setup

echo "🔧 Setting up Local Development MCP server..."

# 0. SSH Key Generation and Management
echo "🔐 Setting up SSH keys..."

SSH_PRIVATE_KEY="$HOME/.ssh/id_rsa"
SSH_PUBLIC_KEY="$HOME/.ssh/id_rsa.pub"
HOMEADDITIONS_KEY="/workspace/.ddev/homeadditions/.ssh/authorized_keys"

# Create .ssh directory
mkdir -p "$HOME/.ssh"

# Check if private key exists in devcontainer
if [ ! -f "$SSH_PRIVATE_KEY" ]; then
    echo "📝 Private key not found, generating new SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f "$SSH_PRIVATE_KEY" -N "" -C "ddev-agents-key-$(date +%s)"
    echo "✅ SSH key pair generated"
else
    echo "✅ SSH private key exists"
fi

# Set correct permissions on private key
chmod 600 "$SSH_PRIVATE_KEY"
chmod 644 "$SSH_PUBLIC_KEY"

# Copy public key to homeadditions (always update to ensure consistency)
if [ -f "$SSH_PUBLIC_KEY" ]; then
    mkdir -p "$(dirname "$HOMEADDITIONS_KEY")"
    cp "$SSH_PUBLIC_KEY" "$HOMEADDITIONS_KEY"
    chmod 644 "$HOMEADDITIONS_KEY"
    echo "✅ Public key synced to homeadditions"
else
    echo "⚠️  Public key not found at $SSH_PUBLIC_KEY"
fi

# 1. Configure SSH client for DDEV containers
echo "🔐 Configuring SSH client..."

# Configure SSH to disable strict host key checking for DDEV containers
# This is safe because we're only connecting to local containers
if ! grep -q "Host ddev-\*" ~/.ssh/config 2>/dev/null || ! grep -q "Host web$" ~/.ssh/config 2>/dev/null; then
    cat >> ~/.ssh/config << 'EOF'

# DDEV container SSH configuration
Host ddev-* web db elasticsearch
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    LogLevel ERROR
    IdentityFile ~/.ssh/id_rsa
EOF
    echo "✅ SSH config updated for DDEV containers"
else
    echo "✅ SSH config already configured"
fi

# Detect SSH user dynamically from web container
# DDEV creates a user in the container matching the host user's UID/GID
# We detect this by SSH'ing to the container and checking who owns /var/www/html
echo "🔍 Detecting web container user..."

# Wait a moment to ensure SSH daemon is ready in web container
sleep 3

# Try common DDEV usernames in order of likelihood
# DDEV typically creates a user matching the host username
COMMON_USERS=("$(whoami)" "vscode" "wodby" "root")

DETECTED_USER=""
for test_user in "${COMMON_USERS[@]}"; do
    # Try to SSH and get the owner of /var/www/html
    OWNER=$(ssh -o ConnectTimeout=2 -o BatchMode=yes "${test_user}@web" "stat -c '%U' /var/www/html 2>/dev/null" 2>/dev/null || echo "")
    
    if [ -n "$OWNER" ] && [ "$OWNER" != "root" ]; then
        DETECTED_USER="$OWNER"
        echo "✅ Detected web container user: $DETECTED_USER"
        break
    fi
done

# If detection failed, fall back to checking local username
if [ -z "$DETECTED_USER" ]; then
    # Use the container's username as fallback
    DETECTED_USER="$(whoami)"
    echo "⚠️  Could not auto-detect via SSH. Using fallback: $DETECTED_USER"
    echo "   If SSH fails, manually set: export DDEV_SSH_USER=<your-username>"
fi

# Set DDEV_SSH_USER
if [ -n "$DETECTED_USER" ]; then
    # Add to shell configs if not already present
    if ! grep -q "DDEV_SSH_USER" ~/.bashrc 2>/dev/null; then
        echo "export DDEV_SSH_USER=\"$DETECTED_USER\"" >> ~/.bashrc
    fi
    if ! grep -q "DDEV_SSH_USER" ~/.zshrc 2>/dev/null; then
        echo "export DDEV_SSH_USER=\"$DETECTED_USER\"" >> ~/.zshrc
    fi
    
    # Set for current session
    export DDEV_SSH_USER="$DETECTED_USER"
fi

# Ensure OpenSSH client is installed
if ! command -v ssh &> /dev/null; then
    echo "📦 Installing OpenSSH client..."
    sudo apt-get update
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y openssh-client
    echo "✅ OpenSSH client installed"
else
    echo "✅ OpenSSH client already installed"
fi

# 2. Install Node.js dependencies (if needed by MCP server)
echo "📦 Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js not found - npx will install on first use"
fi

echo "✅ Setup complete! SSH-based MCP server is ready."
echo "🔑 SSH key: ~/.ssh/id_rsa"
echo "🎯 Connect to DDEV containers via: ssh <username>@<container-name>"
echo "✅ Secure Agents Environment Active"
