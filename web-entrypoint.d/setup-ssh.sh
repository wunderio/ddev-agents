#!/bin/bash
#ddev-generated
# Set up SSH access for the DDEV user (host user in container)
# The DDEV user is automatically created by DDEV with the host's UID/GID

set -e

echo "🔐 Setting up SSH access for DDEV user..."

# Detect the DDEV user by finding who owns /var/www/html
# DDEV sets up /var/www/html to be owned by the host user
if [ -d "/var/www/html" ]; then
    DDEV_USER=$(stat -c '%U' /var/www/html)
    echo "ℹ️  Detected DDEV user from /var/www/html ownership: $DDEV_USER"
else
    echo "⚠️  /var/www/html does not exist, cannot detect DDEV user"
    exit 1
fi

# Get DDEV user's home directory
DDEV_USER_HOME=$(getent passwd "$DDEV_USER" | cut -d: -f6)
if [ -z "$DDEV_USER_HOME" ] || [ "$DDEV_USER_HOME" = "/" ]; then
    echo "⚠️  Could not determine home directory for user $DDEV_USER"
    exit 1
fi

echo "ℹ️  DDEV user home: $DDEV_USER_HOME"

# Persist the detected user to a shared env file for the agents container
SHARED_ENV_FILE="/var/www/html/.ddev/.agents/.env"
mkdir -p "$(dirname "$SHARED_ENV_FILE")"
echo "DDEV_SSH_USER=$DDEV_USER" > "$SHARED_ENV_FILE"
chmod 644 "$SHARED_ENV_FILE"
echo "ℹ️  Wrote SSH user to $SHARED_ENV_FILE"

# Create .ssh directory for DDEV user if needed
SSH_DIR="$DDEV_USER_HOME/.ssh"
if [ ! -d "$SSH_DIR" ]; then
    sudo mkdir -p "$SSH_DIR"
    sudo chown "$DDEV_USER:$(id -gn $DDEV_USER)" "$SSH_DIR"
    sudo chmod 700 "$SSH_DIR"
    echo "✅ Created SSH directory: $SSH_DIR"
fi

# Look for SSH keys from homeadditions
# DDEV mounts homeadditions at /mnt/ddev_config/homeadditions
HOMEADDITIONS_KEY="/mnt/ddev_config/homeadditions/.ssh/authorized_keys"
DDEV_AUTHORIZED_KEYS="$SSH_DIR/authorized_keys"

if [ -f "$HOMEADDITIONS_KEY" ]; then
    if [ ! -f "$DDEV_AUTHORIZED_KEYS" ]; then
        # Copy SSH keys from homeadditions
        sudo cp "$HOMEADDITIONS_KEY" "$DDEV_AUTHORIZED_KEYS"
        sudo chown "$DDEV_USER:$(id -gn $DDEV_USER)" "$DDEV_AUTHORIZED_KEYS"
        sudo chmod 600 "$DDEV_AUTHORIZED_KEYS"
        echo "✅ SSH keys added for user $DDEV_USER"
    else
        # Merge keys if authorized_keys already exists
        sort "$HOMEADDITIONS_KEY" "$DDEV_AUTHORIZED_KEYS" | uniq > "$DDEV_AUTHORIZED_KEYS.tmp"
        sudo mv "$DDEV_AUTHORIZED_KEYS.tmp" "$DDEV_AUTHORIZED_KEYS"
        sudo chown "$DDEV_USER:$(id -gn $DDEV_USER)" "$DDEV_AUTHORIZED_KEYS"
        sudo chmod 600 "$DDEV_AUTHORIZED_KEYS"
        echo "✅ SSH keys merged for user $DDEV_USER"
    fi
    
    # Set DDEV_SSH_USER for other parts of the system
    export DDEV_SSH_USER="$DDEV_USER"
    echo "✅ Set SSH user to: $DDEV_SSH_USER"
else
    echo "ℹ️  SSH keys not yet available at $HOMEADDITIONS_KEY"
    echo "   Keys will be synced by devcontainer when agents container starts"
    # Still set DDEV_SSH_USER so it's available for later key injection
    export DDEV_SSH_USER="$DDEV_USER"
fi

# Ensure /run/sshd exists with correct permissions
# This directory may not persist between container restarts
if [ ! -d "/run/sshd" ]; then
    sudo mkdir -p /run/sshd
fi
sudo chown root:root /run/sshd
sudo chmod 755 /run/sshd

# Start SSH daemon if not already running
if ! pgrep -x sshd > /dev/null; then
    sudo /usr/sbin/sshd
    echo "✅ SSH daemon started - ready for connections from agents container"
else
    echo "✅ SSH daemon already running"
fi

echo "✅ SSH setup complete for remote command execution"
