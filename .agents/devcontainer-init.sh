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

# SSH user strategy for DDEV containers
# The DDEV user (host user in container) is automatically created with SSH keys via homeadditions.
# We need to detect this user and expose it for the MCP server to use.
echo "🔍 Setting up SSH user configuration..."

# Wait a moment for web container to start and run setup-ssh.sh
sleep 2

# The setup-ssh.sh script in the web container sets DDEV_SSH_USER and exports it to environment
# We can try to detect it from the web container
# Fallback: detect by creating a temporary script that queries the web container
TEMP_DETECT="/tmp/detect_ddev_user.sh"
cat > "$TEMP_DETECT" << 'DETECT_EOF'
stat -c '%U' /var/www/html
DETECT_EOF

# Try to detect the DDEV user by SSHing to the web container
# We'll use environment variables to allow connectionwithout keys initially
DETECTED_USER=""
if command -v ssh &> /dev/null; then
    # Try to detect without authentication first (may fail, that's ok)
    DETECTED_USER=$(ssh -o ConnectTimeout=3 -o BatchMode=yes -o PasswordAuthentication=no \
                       "root@web" "stat -c '%U' /var/www/html" 2>/dev/null || echo "")
fi

# If detection failed, use environment or fallback
if [ -z "$DETECTED_USER" ]; then
    # Check if DDEV_SSH_USER was set by the web container setup-ssh.sh
    if [ -n "$DDEV_SSH_USER" ]; then
        DETECTED_USER="$DDEV_SSH_USER"
        echo "✅ Using DDEV_SSH_USER from environment: $DETECTED_USER"
    else
        # Last resort: use current user as fallback
        DETECTED_USER="$(whoami)"
        echo "⚠️  Could not detect DDEV user, using fallback: $DETECTED_USER"
        echo "   This may not work if you're in a different user context"
    fi
else
    echo "✅ Detected DDEV user: $DETECTED_USER"
fi

# Clean up
rm -f "$TEMP_DETECT"

# Export DDEV_SSH_USER for the MCP server and other tools
export DDEV_SSH_USER="$DETECTED_USER"

# Add to shell configs for persistence
if [ -n "$DETECTED_USER" ]; then
    if ! grep -q "export DDEV_SSH_USER=" ~/.bashrc 2>/dev/null; then
        echo "export DDEV_SSH_USER=\"$DETECTED_USER\"" >> ~/.bashrc
    fi
    if ! grep -q "export DDEV_SSH_USER=" ~/.zshrc 2>/dev/null; then
        echo "export DDEV_SSH_USER=\"$DETECTED_USER\"" >> ~/.zshrc
    fi
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
