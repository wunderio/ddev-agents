#!/bin/bash
set -e

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends \
    libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 libcairo2 libcups2 \
    libdbus-1-3 libgbm1 libpango-1.0-0 libasound2 libxcomposite1 \
    libxdamage1 libxfixes3 libxkbcommon0 libxrandr2

apt-get clean
rm -rf /var/lib/apt/lists/*
