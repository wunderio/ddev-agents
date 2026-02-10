#!/bin/bash
set -e

# Local Development MCP server setup

echo "🔧 Setting up Local Development MCP server..."

# 0. Install Docker CLI if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker CLI..."
    
    # Install prerequisite packages
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    
    # Add Docker's official GPG key (remove existing first to avoid prompts)
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo rm -f /etc/apt/keyrings/docker.gpg
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository (overwrite if exists)
    echo \
      "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker CLI only (not the engine)
    sudo apt-get update
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce-cli
    
    echo "✅ Docker CLI installed"
else
    echo "✅ Docker CLI already installed"
fi

# Ensure docker group exists
if ! getent group docker > /dev/null; then
    echo "👥 Creating docker group..."
    sudo groupadd docker
    echo "✅ Docker group created"
fi

# Add vscode user to docker group for socket access
if ! groups vscode | grep -q docker; then
    echo "🔐 Adding vscode user to docker group..."
    sudo usermod -aG docker vscode
    echo "✅ User added to docker group (restart your shell or run: exec su -l vscode)"
fi

# Fix docker socket permissions
if [ -S /var/run/docker.sock ]; then
    echo "🔧 Setting docker socket permissions..."
    sudo chgrp docker /var/run/docker.sock
    sudo chmod 660 /var/run/docker.sock
    echo "✅ Docker socket permissions updated"
fi

# 2. Set Python environment variables to prevent bytecode generation
export PYTHONDONTWRITEBYTECODE=1
if ! grep -q "PYTHONDONTWRITEBYTECODE" ~/.bashrc; then
    echo "export PYTHONDONTWRITEBYTECODE=1" >> ~/.bashrc
fi
if ! grep -q "PYTHONDONTWRITEBYTECODE" ~/.zshrc; then
    echo "export PYTHONDONTWRITEBYTECODE=1" >> ~/.zshrc
fi
echo "✅ Python bytecode generation disabled"

# 3. Install Python dependencies for the MCP Bridge
echo "📦 Installing Python dependencies..."
pip install mcp httpx docker pyyaml

# 4. Make bridge.py executable
if [ -f "/workspace/.agents/bridge.py" ]; then
    chmod +x /workspace/.agents/bridge.py
    echo "✅ bridge.py is executable"
fi

echo "✅ Setup complete! Local Development MCP server is ready."