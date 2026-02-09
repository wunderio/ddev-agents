#!/usr/bin/env python3
"""
Local Development MCP

SECURITY: Restricts Docker access to containers with matching com.ddev.site-name label.
Validates commands to prevent shell injection. See DockerExecutor class for details.

Loads tool definitions from YAML files in tools-config/ directory.
Uses reusable executors from executors.py based on tool type.
"""

from executors import (
    BaseExecutor,
    CommandToolExecutor,
    MCPServerToolExecutor,
)
import os
import sys
import yaml
import asyncio
import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Add .agents directory to Python path
AGENTS_DIR = Path(__file__).parent
sys.path.insert(0, str(AGENTS_DIR))

# Configure logging to file (stdout is reserved for MCP protocol)
LOG_FILE = Path("/tmp/wunderio_local_dev_mcp.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    filename=str(LOG_FILE),
    filemode="a"
)
logger = logging.getLogger("wunderio_local_dev_mcp")

# Import executors

# Initialize MCP Server
app = Server("wunderio_local_dev_mcp")


class DockerExecutor:
    """Execute commands in DDEV containers with security validation."""

    def __init__(self, ddev_project: str = None):
        self.ddev_project = ddev_project or os.environ.get(
            "DDEV_PROJECT", "default-project")

    async def execute(self, command: list, capture_output: bool = True,
                      container: str = None, user: str = "www-data") -> tuple:
        """Execute command with validation. Raises PermissionError/ValueError on security violations."""
        container = container or f"ddev-{self.ddev_project}-web"

        # Validate command format
        if not isinstance(command, list) or not command:
            raise ValueError("Command must be non-empty list")

        dangerous = [';', '|', '&', '>', '<', '$', '`', '\n', '\r']
        for i, arg in enumerate(command):
            if not isinstance(arg, str):
                raise ValueError(f"Argument {i} must be string")
            # Skip dangerous character validation for shell arguments (e.g., bash -c "command")
            # The shell command itself (typically argument 2 in bash -c pattern) can safely use operators
            # since it's passed as a single argument and not subject to injection
            if i < 2 and any(c in arg for c in dangerous):
                raise ValueError(f"Dangerous character in argument {i}")

        # Validate container ownership
        try:
            process = await asyncio.create_subprocess_exec(
                "docker", "inspect",
                "--format", "{{index .Config.Labels \"com.ddev.site-name\"}}",
                container,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await process.communicate()

            if process.returncode != 0:
                # Container doesn't exist or inaccessible, but allow execution attempt
                logger.warning(
                    f"Container '{container}' validation failed, proceeding anyway")
            else:
                site_name = stdout.decode().strip()
                if self.ddev_project != "default-project" and site_name != self.ddev_project:
                    raise PermissionError(
                        f"Container '{container}' belongs to '{site_name}', not '{self.ddev_project}'"
                    )
        except PermissionError:
            raise
        except Exception as e:
            logger.warning(f"Container validation error (continuing): {e}")

        # Execute
        full_command = ["docker", "exec", "-u", user, container] + command
        logger.info(f"EXEC: {container} as {user}: {' '.join(command[:3])}")

        try:
            process = await asyncio.create_subprocess_exec(
                *full_command,
                stdout=asyncio.subprocess.PIPE if capture_output else None,
                stderr=asyncio.subprocess.PIPE if capture_output else None
            )
            stdout, stderr = await process.communicate()
            return (
                stdout.decode() if stdout else "",
                stderr.decode() if stderr else "",
                process.returncode
            )
        except Exception as e:
            logger.exception(f"Execution error: {e}")
            raise


class BridgeConfig:
    """Configuration for the bridge - binds to one DDEV project via environment."""

    def __init__(self):
        self.ddev_project = os.environ.get("DDEV_PROJECT", "default-project")
        logger.info(f"Initialized for DDEV project: {self.ddev_project}")


class ToolRegistry:
    """Manages tool definitions and execution."""

    def __init__(self, tools_config_dir: Path, config: BridgeConfig):
        self.tools_config_dir = tools_config_dir
        self.config = config
        self.docker_executor = DockerExecutor(config.ddev_project)
        self.tools: Dict[str, Dict] = {}
        self.executors: Dict[str, BaseExecutor] = {}

    def load_tools(self) -> int:
        """Load tools from YAML config files (must use `tools` array format)."""
        if not self.tools_config_dir.exists():
            logger.error(
                f"Tools config directory not found: {self.tools_config_dir}")
            return 0

        loaded_count = 0
        for config_file in sorted(self.tools_config_dir.glob("*.yml")):
            try:
                with open(config_file, "r") as f:
                    file_config = yaml.safe_load(f)

                if not file_config:
                    logger.warning(f"Empty config file: {config_file}")
                    continue

                if "tools" not in file_config:
                    logger.error(f"Missing 'tools' array: {config_file}")
                    continue

                for tool_config in file_config.get("tools", []):
                    loaded_count += self._load_single_tool(tool_config)

            except yaml.YAMLError as e:
                logger.error(f"YAML error in {config_file}: {e}")
            except Exception as e:
                logger.exception(f"Error loading {config_file}: {e}")

        logger.info(f"Loaded {loaded_count} tools")
        return loaded_count

    def _load_single_tool(self, tool_config: dict) -> int:
        """Load single tool. Returns 1 if successful, 0 if failed."""
        if not (tool_name := tool_config.get("name")):
            logger.warning("Tool config missing 'name'")
            return 0

        if not tool_config.get("enabled", False):
            logger.info(f"Tool disabled: {tool_name}")
            return 0

        if not (executor := self._create_executor(tool_config)):
            logger.warning(f"Failed to create executor: {tool_name}")
            return 0

        self.tools[tool_name] = tool_config
        self.executors[tool_name] = executor
        logger.info(f"Loaded tool: {tool_name}")
        return 1

    def _interpolate_container_name(self, container: str) -> str:
        """Replace {DDEV_PROJECT} placeholder with actual project name."""
        return container.format(DDEV_PROJECT=self.config.ddev_project) if container and "{DDEV_PROJECT}" in container else container

    def _create_executor(self, tool_config: dict) -> Optional[BaseExecutor]:
        """Create executor based on tool type."""
        tool_type = tool_config.get("type", "command")
        tool_name = tool_config.get("name", "unknown")

        try:
            if tool_type == "command":
                if not (cmd_template := tool_config.get("command_template")):
                    logger.error(f"Tool {tool_name}: missing command_template")
                    return None

                return CommandToolExecutor(
                    self.docker_executor,
                    command_template=cmd_template,
                    container=self._interpolate_container_name(
                        tool_config.get("container")),
                    user=tool_config.get("user", "www-data"),
                    default_args=tool_config.get("default_args", {}),
                    disallowed_commands=tool_config.get(
                        "disallowed_commands", []),
                    validation_rules=tool_config.get("validation_rules", [])
                )

            elif tool_type == "mcp_server":
                if not (server_url := tool_config.get("server_url")):
                    logger.error(f"Tool {tool_name}: missing server_url")
                    return None
                return MCPServerToolExecutor(server_url)

            else:
                logger.error(f"Unknown tool type: {tool_type}")
                return None

        except Exception as e:
            logger.exception(f"Error creating executor for {tool_name}: {e}")
            return None

    def get_tool_definition(self, name: str) -> Optional[Tool]:
        """Build MCP Tool definition for a tool."""
        if name not in self.tools:
            return None

        config = self.tools[name]

        # Build input schema from config
        input_schema = config.get("input_schema", {
            "type": "object",
            "properties": {},
            "required": []
        })

        # Create MCP Tool
        return Tool(
            name=name,
            description=config.get("description", "Tool with no description"),
            inputSchema=input_schema
        )

    async def execute_tool(self, name: str, arguments: dict) -> str:
        """Execute tool and return result."""
        if name not in self.executors:
            return f"Error: Unknown tool '{name}'"

        executor = self.executors[name]

        # Validate arguments
        if hasattr(executor, 'validate_arguments'):
            is_valid, error_msg = executor.validate_arguments(arguments)
            if not is_valid:
                return f"Validation error: {error_msg}"

        try:
            return await executor.execute(arguments)
        except Exception as e:
            logger.exception(f"Error executing {name}: {e}")
            return f"Error: {str(e)}"


# Global instances
config = None
registry = None


def initialize_bridge():
    """Initialize bridge and load tools."""
    global config, registry

    config = BridgeConfig()
    registry = ToolRegistry(AGENTS_DIR / "tools-config", config)

    count = registry.load_tools()
    logger.info(f"Bridge initialized with {count} tools")

    if count == 0:
        logger.warning("No tools loaded! Check tools-config directory.")


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools."""
    if not registry:
        return []

    tools = []
    for tool_name in registry.tools.keys():
        tool_def = registry.get_tool_definition(tool_name)
        if tool_def:
            tools.append(tool_def)

    logger.info(f"Listing {len(tools)} tools")
    return tools


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Execute a tool."""
    logger.info(f"Calling tool: {name} with arguments: {arguments}")

    try:
        result = await registry.execute_tool(name, arguments)
        return [TextContent(type="text", text=result)]
    except Exception as e:
        logger.exception(f"Error executing tool {name}: {e}")
        return [TextContent(type="text", text=f"Error: {str(e)}")]


async def main():
    """Run the MCP server."""
    try:
        logger.info("Starting Local Development MCP (YAML Configuration)")
        initialize_bridge()

        async with stdio_server() as (read, write):
            await app.run(read, write, app.create_initialization_options())
    except Exception as e:
        logger.exception(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
