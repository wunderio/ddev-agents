#ddev-generated
FROM mcr.microsoft.com/devcontainers/python:3-bookworm

USER root

# Install PHP 8.4 from Sury repository with extensions required for Drupal/WordPress tooling,
# plus system packages needed by Composer and general development.
RUN apt-get update && apt-get install -y --no-install-recommends \
      apt-transport-https lsb-release ca-certificates curl \
  && curl -fsSL https://packages.sury.org/php/apt.gpg \
       -o /usr/share/keyrings/deb.sury.org-php.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-php.gpg] \
       https://packages.sury.org/php/ $(lsb_release -sc) main" \
       > /etc/apt/sources.list.d/sury-php.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
       php8.4-cli php8.4-curl php8.4-xml php8.4-mbstring \
       php8.4-mysql php8.4-zip php8.4-tokenizer \
       unzip build-essential file procps jq default-mysql-client \
  && rm -rf /var/lib/apt/lists/*

# Install Composer globally
RUN curl -fsSL https://getcomposer.org/installer | \
      php -- --install-dir=/usr/local/bin --filename=composer

# Install yq (YAML processor)
RUN YQ_ARCH=$(dpkg --print-architecture) && \
      curl -fsSL "https://github.com/mikefarah/yq/releases/latest/download/yq_linux_${YQ_ARCH}" \
      -o /usr/local/bin/yq && chmod +x /usr/local/bin/yq

# Install Claude Code managed settings
RUN mkdir -p /etc/claude-code
COPY .ddev/claude-managed-settings.json /etc/claude-code/managed-settings.json

USER vscode
