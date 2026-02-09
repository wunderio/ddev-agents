#!/bin/bash
set -e

# Local Development MCP server setup

echo "🔧 Setting up Local Development MCP server..."

# 0. Set Python environment variables to prevent bytecode generation
export PYTHONDONTWRITEBYTECODE=1
echo "export PYTHONDONTWRITEBYTECODE=1" >> ~/.bashrc
echo "export PYTHONDONTWRITEBYTECODE=1" >> ~/.zshrc
echo "✅ Python bytecode generation disabled"

# 1. Install Python dependencies for the MCP Bridge
echo "📦 Installing Python dependencies..."
pip install mcp httpx docker pyyaml

# 2. Make bridge.py executable
if [ -f "/workspace/.agents/bridge.py" ]; then
    chmod +x /workspace/.agents/bridge.py
    echo "✅ bridge.py is executable"
fi

echo "✅ Setup complete! Local Development MCP server is ready."