# Local Development MCP

An MCP server that gives AI agents tools to run commands in DDEV containers. Tools are defined in YAML configuration files.

## Proof Of Concept

### How to use

- Rebuild the devcontainer.
- Open extensions from the VSCode sidebar. You should see an installed wunderio_local_dev_mcp MCP server at the bottom, with an error sign. 
- Due to VS Code bug, you need to refresh the allowed MCP registry by searching @mcp from the extension gallery search. This will allow the MCP server to run. NOTE: This needs to be done every time you open VSCode or rebuild the devcontainer. 
- During the first run, you will need to open the Command Palette from VSCode and search for MCP Servers: List, find wunderio_local_dev_mcp and hit Start. This needs to be done only once.  

### Future improvements

- Separate the MCP server code from the add-on either by publishing it as a Python library, Docker image to be added on top of the current devcontainer, or create our own custom devcontainer image including a local mcp server. 

## Files

- `bridge.py` – Main MCP server
- `executors.py` – Command/tool executors
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

## Logging

View MCP bridge logs:

```bash
tail -f /tmp/wunderio_local_dev_mcp.log
```
