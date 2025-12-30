# Wunder.io AI Agent Guidelines

## 🛡 Environment & Isolation
- **Runtime:** You are running in the `ddev-agent` container.
- **Root:** Your workspace is `/workspace`.
- **Constraint:** Do NOT suggest commands that run on the host. Always assume a Linux/Zsh environment.

## 📝 Workflow Standards
1. **MkDocs:** We use MkDocs. Ensure `mkdocs.yml` is updated when adding pages.
2. **Commands:** You can run `mkdocs build` or `pip install` directly in this terminal.
3. **Safety:** If a user asks for a command, verify it works in Debian Linux.

## 🚫 Restrictions
- Never output absolute paths like `/Users/name/...`. Use relative paths or `/workspace`.
- Do not modify `.ddev/` configuration files unless explicitly asked.

## 🚫 Prohibited Actions
- **NO GIT OPERATIONS:** You do not have git credentials.
    - DO NOT attempt to commit, push, or pull.
    - DO NOT ask the user to run git commands inside the VS Code terminal.
    - IF you need to save work, simply write the files to disk. The user will handle version control externally.