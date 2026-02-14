#!/bin/bash
set -e

# Local Development MCP server setup

echo "🔧 Setting up Local Development MCP server..."

# 0. SSH Key Generation and Management
echo "🔐 Setting up SSH keys..."

# Use homeadditions for persistent storage (on host filesystem)
HOMEADDITIONS_SSH_DIR="/workspace/.ddev/homeadditions/.ssh"
HOMEADDITIONS_PRIVATE_KEY="$HOMEADDITIONS_SSH_DIR/id_rsa"
HOMEADDITIONS_PUBLIC_KEY="$HOMEADDITIONS_SSH_DIR/id_rsa.pub"
HOMEADDITIONS_AUTHORIZED_KEYS="$HOMEADDITIONS_SSH_DIR/authorized_keys"

CONTAINER_SSH_DIR="$HOME/.ssh"
CONTAINER_PRIVATE_KEY="$CONTAINER_SSH_DIR/id_rsa"
CONTAINER_PUBLIC_KEY="$CONTAINER_SSH_DIR/id_rsa.pub"

# Create directories
mkdir -p "$CONTAINER_SSH_DIR"
mkdir -p "$HOMEADDITIONS_SSH_DIR"

# Check if keys exist in homeadditions (persistent storage on host)
if [ -f "$HOMEADDITIONS_PRIVATE_KEY" ] && [ -f "$HOMEADDITIONS_PUBLIC_KEY" ]; then
    echo "✅ Found existing SSH keys in homeadditions, copying to container..."
    cp "$HOMEADDITIONS_PRIVATE_KEY" "$CONTAINER_PRIVATE_KEY"
    cp "$HOMEADDITIONS_PUBLIC_KEY" "$CONTAINER_PUBLIC_KEY"
    chmod 600 "$CONTAINER_PRIVATE_KEY"
    chmod 644 "$CONTAINER_PUBLIC_KEY"
    echo "✅ SSH keys restored from homeadditions"
else
    echo "📝 No SSH keys in homeadditions, generating new key pair..."
    ssh-keygen -t rsa -b 4096 -f "$CONTAINER_PRIVATE_KEY" -N "" -C "ddev-agents-key-$(date +%s)"
    
    # Save keys to homeadditions for persistence
    cp "$CONTAINER_PRIVATE_KEY" "$HOMEADDITIONS_PRIVATE_KEY"
    cp "$CONTAINER_PUBLIC_KEY" "$HOMEADDITIONS_PUBLIC_KEY"
    chmod 600 "$HOMEADDITIONS_PRIVATE_KEY"
    chmod 644 "$HOMEADDITIONS_PUBLIC_KEY"
    echo "✅ SSH key pair generated and saved to homeadditions"
fi

# Always ensure public key is in authorized_keys for web container
cp "$HOMEADDITIONS_PUBLIC_KEY" "$HOMEADDITIONS_AUTHORIZED_KEYS"
chmod 644 "$HOMEADDITIONS_AUTHORIZED_KEYS"
echo "✅ Public key synced to authorized_keys"

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

# Try to detect the DDEV user from the shared env file written by the web container
DETECTED_USER=""
SHARED_ENV_FILE="/workspace/.ddev/.agents/.env"
if [ -f "$SHARED_ENV_FILE" ]; then
    DETECTED_USER="$(grep -E '^DDEV_SSH_USER=' "$SHARED_ENV_FILE" | head -n 1 | sed 's/^DDEV_SSH_USER=//' | tr -d '\n\r')"
fi


# Try to detect the DDEV user by SSHing to the web container
# We'll use environment variables to allow connection without keys initially
if command -v ssh &> /dev/null; then
    # Try to detect without authentication first (may fail, that's ok)
    if [ -z "$DETECTED_USER" ]; then
        DETECTED_USER=$(ssh -o ConnectTimeout=3 -o BatchMode=yes -o PasswordAuthentication=no \
                           "root@web" "stat -c '%U' /var/www/html" 2>/dev/null || echo "")
    fi
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
