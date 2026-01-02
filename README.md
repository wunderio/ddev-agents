# DDEV Agents Add-on

Standardized environment for creating an isolated workspace where agentic AI tools can be run safely and consistently across Wunder.io projects.

## Overview

The `ddev-agents` add-on provides a pre-configured `agents` service and VS Code Dev Container settings. Key benefits include:

1.  **Host Isolation**: AI agents run in a dedicated, isolated container. This protects your host machine from potentially errant scripts or external packages executed by AI tools.
2.  **Standardization**: Every project uses the same high-quality, pre-configured environment.
3.  **Maintainability**: Improvements and security updates are pushed centrally through the add-on.

## Workflow & Security

-   **Git Operations**: All Git operations (`commit`, `push`, `pull`) should be performed on your **host machine**. The container provides access to the code, but you should use your host's Git configuration and SSH keys for repository management.
-   **Credential Safety**: ⚠️ **NEVER put any credentials, API keys, or secrets inside the devcontainer.** Always use environment variables or DDEV's built-in secret management to pass necessary keys to the container without storing them in the image or container filesystem.

## Installation

To install the add-on in your DDEV project, run:

```bash
ddev get wunderio/ddev-agents
ddev restart
```

## Supported Environments

This add-on is specifically designed and supported for:

-   **VS Code** (Primary interface)
-   **Antigravity** (AI Coding Assistant)

### ⚠️ CRITICAL: Connection Check
**Always verify that your IDE is connected to the Dev Container before running any AI agents.** 

If you run agents while still on your host machine, you lose the safety of the isolated environment, and scripts will have direct access to your local system. Look for the "Dev Container: Agents" indicator in the bottom-left corner of VS Code (or your editor's equivalent) before proceeding.

### 1. Start DDEV
Before opening the devcontainer, ensure your DDEV project is running:
```bash
ddev start
```

### 2. Open in VS Code
1.  Open your project in **VS Code**.
2.  When prompted, click **"Reopen in Container"** (or use the Command Palette: `Dev Containers: Reopen in Container`).
3.  VS Code will connect to the `agents` container, providing a terminal with all necessary tools pre-installed.

## Features

-   **Isolated Python Environment**: Based on `mcr.microsoft.com/devcontainers/python:3-bookworm`.
-   **Integrated Tools**: Pre-installed Node.js, GH CLI, Git, and common utilities.
-   **GitHub Copilot (Agent Mode)**: Includes the `gh-copilot` CLI extension and a convenience `copilot` alias.
-   **Secure Authentication**: Uses your host's `GH_TOKEN` automatically, so you never have to type credentials inside the container.

## GitHub Authentication (Recommended Setup)

To use GitHub Copilot (Agent Mode) or `gh` commands without repetitive logins, set up a Personal Access Token (PAT) on your **host machine**.

### 1. Generate a GitHub Token
1.  Go to [GitHub Fine-grained Tokens](https://github.com/settings/personal-access-tokens/new).
2.  **Name & Expiration**: Set a name (e.g., "Copilot CLI Local") and a reasonable expiration.
3.  **Repository Access**: Select **Public Repositories (read-only)** or **Only select repositories** (even if you select none). The CLI works on local files and doesn't need to see your remote repos.
4.  **Account Permissions**:
    -   Find the **Copilot Requests** dropdown.
    -   Select **Access: Read-only**.
5.  Generate and copy the token.

### 2. Configure your Host Machine
Add the token to your shell profile so it's always available when you start the devcontainer.

**For macOS/Linux (Zsh or Bash):**
1.  Open your shell profile (e.g., `~/.zshrc` or `~/.profile`):
    ```bash
    nano ~/.zshrc
    ```
2.  Add this line at the end:
    ```bash
    export GH_TOKEN=your_token_here
    ```
3.  Save and restart your terminal (or run `source ~/.zshrc`).

> [!IMPORTANT]
> **Troubleshooting for macOS**: If the token is not recognized after rebuilding, try launching VS Code directly from your terminal by running `code .` in your project folder. This ensures VS Code inherits your shell's environment variables.

### 3. Benefits
-   **Zero-Interaction**: The devcontainer automatically picks up `$GH_TOKEN` and configures the `gh-copilot` extension.
-   **Security**: No credentials are ever typed or stored inside the container's history/filesystem. 

## Centralized Development

The purpose of this repository is to serve as the single source of truth for our agentic workflows. By using `ddev get`, projects can stay up-to-date with our latest agent configurations by simply running `ddev get wunderio/ddev-agents` again.
