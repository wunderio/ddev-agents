# Local Development MCP

An MCP server that gives AI agents tools to run commands in DDEV containers via SSH. Tools are defined in YAML configuration files.

## Architecture

- **Execution Method**: SSH (passwordless key-based authentication)
- **SSH Keys**: Auto-generated per developer at `.agents/.ssh/`
- **User Resolution**: Dynamic based on DDEV environment
- **No Docker Socket**: Fully isolated from host Docker daemon

## Proof Of Concept

### How to use

1. **Installation:**
   ```bash
   cd /path/to/ddev-project
   ddev get wunderio/ddev-agents
   ddev restart  # Builds container and generates SSH keys automatically
   ```

2. **First Launch:**
   - Open VS Code in the devcontainer
   - You'll see the wdrmcp MCP server in extensions (bottom panel)
   - Note: Due to VS Code bug, search `@mcp` in extension gallery to enable the MCP registry
   - Open Command Palette: `MCP Servers: List`, find wdrmcp and click Start
   - This only needs to be done once per VS Code session

3. **Using Tools:**
   - Open VS Code Copilot chat
   - Use tools like `drush`, `composer_install`, `logs_nginx_access`, etc.
   - All tools connect via SSH automatically

### How SSH Key Generation Works

- **Automatic**: SSH keys are generated on devcontainer startup (no manual steps needed)
- **Persistent Public Key**: Public key is synced to `.ddev/homeadditions/.ssh/authorized_keys`
- **Regeneration**: If you recreate the devcontainer, new keys are auto-generated and synced
- **No Input Needed**: Everything happens in the background during container startup  

## Files

- `tools-config/` – YAML tool definitions

## Adding a Tool

Create a file in `tools-config/my_tool.yml`:

```yaml
tools:
  - name: my_tool
    type: command
    enabled: true
    description: "What this tool does"
    command_template: "my_command {arg1}"
    ssh_target: "{DDEV_PROJECT}.ddev.site"
    ssh_user: "${DDEV_SSH_USER}"
    working_dir: "/var/www/html"
    input_schema:
      type: object
      properties:
        arg1:
          type: string
          description: "Argument description"
      required:
        - arg1
```

## SSH Configuration

### SSH Key Generation

SSH keys are **automatically generated** on devcontainer startup:

1. **First Time**: When the devcontainer starts, `setup.sh` generates a new RSA 4096-bit key pair
2. **Persistence**: 
   - Private key stored in devcontainer home: `~/.ssh/id_rsa` (ephemeral per container)
   - Public key synced to DDEV homeadditions: `.ddev/homeadditions/.ssh/authorized_keys` (persistent)
3. **Automatic Recovery**: If the devcontainer is recreated, setup.sh generates new keys and updates authorized_keys automatically

### Environment Variables

- `DDEV_PROJECT` - Auto-populated by DDEV (e.g., "myproject")
- `DDEV_SSH_USER` - SSH username for connecting to containers (auto-detected from web container on startup)

### SSH Key Locations

**Inside devcontainer:**
- Private key: `~/.ssh/id_rsa` (auto-generated on container start)
- Public key: `~/.ssh/id_rsa.pub` (auto-generated on container start)
- SSH config: `~/.ssh/config` (auto-configured)

**On host (persistent):**
- Public key: `.ddev/homeadditions/.ssh/authorized_keys` (synced from container)

## Available Tool Types

- `command` – Run shell commands with parameter substitution
- `mcp_server` – Proxy to additional internal MCP servers

### Command Tool Type

Command tools execute shell commands in DDEV containers with parameter substitution.

Example:

```yaml
tools:
  - name: my_command_tool
    type: command
    enabled: true
    description: "Execute a custom command"
    command_template: "my_command {arg1}"
    ssh_target: "{DDEV_PROJECT}.ddev.site"
    ssh_user: "${DDEV_SSH_USER}"

    input_schema:
      type: object
      properties:
        arg1:
          type: string
      required:
        - arg1
```

### MCP Server Tool Type

MCP Server tools proxy requests to other MCP servers via HTTP. This allows the Python MCP server to act as a gateway to other specialized MCP servers.

**Dynamic Tool Discovery:** When `expose_remote_tools: true` is set, the proxy will query the remote MCP server for all its available tools and expose them as if they were local tools. This allows seamless integration with external MCP servers.

Example (single proxy tool):

```yaml
tools:
  - name: my_mcp_tool
    type: mcp_server
    enabled: true
    description: "Proxy to another MCP server"
    server_url: "http://localhost:8080/endpoint"
    forward_args: true       # Optional: forward arguments (default: true)
    timeout: 30              # Optional: timeout in seconds (default: 30)
    auth_username: "user"    # Optional: basic auth username
    auth_password: "pass"    # Optional: basic auth password
    input_schema:
      type: object
      properties:
        query:
          type: string
      required:
        - query
```

Example (dynamic tool exposure):

```yaml
tools:
  - name: drupal_mcp
    type: mcp_server
    enabled: true
    description: "Proxy to Drupal MCP server"
    server_url: "https://drupal-project.ddev.site/mcp/post"
    auth_username: "admin"
    auth_password: "admin"
    verify_ssl: false            # Disable for local dev with self-signed certs
    expose_remote_tools: true    # Dynamically fetch and expose remote tools
    tool_prefix: "drupal_"       # Optional: prefix remote tool names
    timeout: 30
```

See [tools-config/drupal_mcp.yml](tools-config/drupal_mcp.yml) for example.

## Logging

View MCP server logs:

```bash
tail -f /tmp/wdrmcp.log
```

## SSH Connection Details

Tools connect to DDEV containers via SSH:
- **Method**: Passwordless SSH using RSA key pairs
- **Host**: `{project}.ddev.site` (resolves to DDEV container)
- **User**: Dynamic (from `DDEV_SSH_USER` environment variable)
- **Key**: `~/.ssh/id_rsa` (mounted from `.agents/.ssh/`)
- **Config**: StrictHostKeyChecking disabled for ddev-* hosts
