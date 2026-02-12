# Local Development MCP

An MCP server that gives AI agents tools to run commands in DDEV containers. Tools are defined in YAML configuration files.

## Proof Of Concept

### How to use

- Rebuild the devcontainer.
- Open extensions from the VSCode sidebar. You should see an installed wdrmcp MCP server at the bottom, with an error sign.
- Due to VS Code bug, you need to refresh the allowed MCP registry by searching @mcp from the extension gallery search. This will allow the MCP server to run. NOTE: This needs to be done every time you open VSCode or rebuild the devcontainer.
- During the first run, you will need to open the Command Palette from VSCode and search for MCP Servers: List, find wdrmcp and hit Start. This needs to be done only once.  

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
    input_schema:
      type: object
      properties:
        arg1:
          type: string
          description: "Argument description"
      required:
        - arg1
```

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
    container: "ddev-{DDEV_PROJECT}-web"
    user: auto:uid-from-path
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

View MCP bridge logs:

```bash
tail -f /tmp/wdrmcp.log
```
