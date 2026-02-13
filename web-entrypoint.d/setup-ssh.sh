#!/bin/bash
# Start SSH daemon for remote command execution from agents container
# Note: SSH keys are automatically managed via DDEV homeadditions

set -e

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
