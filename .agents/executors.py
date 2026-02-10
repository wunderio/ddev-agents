#!/usr/bin/env python3
"""
Tool Executors - Reusable execution logic for different tool types

Provides executor classes that implement the actual execution logic.
Tool YAML files declare which executor to use and provide parameters.
"""

import os
import re
import httpx
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import Tuple, Optional

logger = logging.getLogger("wdrmcp.executors")


class BaseExecutor(ABC):
    """Abstract base class for tool executors."""

    @abstractmethod
    async def execute(self, arguments: dict) -> str:
        """Execute the tool with given arguments. Returns output as string."""
        pass

    @abstractmethod
    def validate_arguments(self, arguments: dict) -> Tuple[bool, str]:
        """Validate arguments. Returns (is_valid, error_message)."""
        pass


class CommandToolExecutor(BaseExecutor):
    """Execute shell commands with argument substitution ({placeholder} syntax)."""

    def __init__(self, docker_executor, command_template: str,
                 container: str = None, user: str = None,
                 default_args: dict = None, disallowed_commands: list = None,
                 shell: str = "/bin/bash", validation_rules: list = None):
        self.docker_executor = docker_executor
        self.command_template = command_template
        self.container = container
        self.user = user
        self.default_args = default_args or {}
        self.disallowed_commands = disallowed_commands or []
        self.shell = shell
        self.validation_rules = validation_rules or []

    def _validate_rules(self, value: str) -> Tuple[bool, str]:
        """Check validation rules against a string value."""
        for rule in self.validation_rules:
            if isinstance(rule, dict):
                pattern = rule.get("pattern", "")
                message = rule.get(
                    "message",
                    f"Validation failed for pattern: {pattern}"
                )
                if pattern and re.search(pattern, value):
                    return (False, message)
        return (True, "")

    async def _resolve_user(self) -> str:
        """Resolve auto:uid-from-path to actual UID from container file ownership."""
        if not self.user or not self.user.startswith("auto:uid-from-path"):
            return self.user

        # Parse optional path from user string
        # Format: "auto:uid-from-path" or "auto:uid-from-path:/path/to/file"
        if ":" in self.user.split("auto")[1]:
            # Contains a path: "auto:uid-from-path:/var/www/html"
            parts = self.user.split(":", 2)
            target_path = parts[2] if len(parts) > 2 else "/var/www/html"
        else:
            # Default path
            target_path = "/var/www/html"

        try:
            # Use stat to get UID of the target path in container
            stdout, stderr, returncode = await self.docker_executor.execute(
                ["/bin/sh", "-c", f"stat -c %u {target_path}"],
                container=self.container,
                user="root"
            )

            if returncode == 0:
                uid = stdout.strip()
                logger.info(
                    f"Resolved auto:uid-from-path:{target_path} to UID {uid}")
                return uid
            else:
                logger.warning(
                    f"Failed to get UID for {target_path}: {stderr}. "
                    f"Falling back to www-data"
                )
                return "www-data"
        except Exception as e:
            logger.exception(f"Error resolving auto:uid-from-path: {e}")
            return "www-data"

    def _normalize_paths(self, value):
        """Normalize devcontainer paths to container paths in strings."""
        host_root = os.getenv("HOST_PROJECT_ROOT", "/workspace")
        container_root = os.getenv("CONTAINER_PROJECT_ROOT", "/var/www/html")

        if isinstance(value, str):
            if value.startswith(host_root + "/"):
                return container_root + value[len(host_root):]
            return value

        if isinstance(value, list):
            return [self._normalize_paths(item) for item in value]

        if isinstance(value, dict):
            return {key: self._normalize_paths(val) for key, val in value.items()}

        return value

    async def execute(self, arguments: dict) -> str:
        """Execute shell command with argument substitution."""
        # Resolve user (handles auto:uid-from-path syntax)
        user = await self._resolve_user()

        # Merge with defaults
        merged_args = {**self.default_args, **arguments}
        merged_args = self._normalize_paths(merged_args)

        # Check blacklist
        if 'command' in merged_args and merged_args['command'] in self.disallowed_commands:
            logger.warning(
                f"Blocked disallowed command: {merged_args['command']}")
            return f"Error: Command '{merged_args['command']}' is not allowed"

        # Substitute arguments
        try:
            cmd_str = self.command_template.format(**merged_args)
        except KeyError as e:
            return f"Error: Missing required argument {e}"

        # Validate against rendered command as a final safeguard
        is_valid, error_msg = self._validate_rules(cmd_str)
        if not is_valid:
            return f"Validation error: {error_msg}"

        # Execute
        stdout, stderr, returncode = await self.docker_executor.execute(
            [self.shell, "-c", cmd_str],
            container=self.container,
            user=user
        )

        if returncode != 0:
            return f"Execution failed (code {returncode})\nStderr: {stderr}"

        return stdout.strip() if stdout else ""

    def validate_arguments(self, arguments: dict) -> Tuple[bool, str]:
        """Check required placeholders and validate against rules."""
        # First check: validate against rules (pattern matching)
        args_str = str(arguments)
        is_valid, error_msg = self._validate_rules(args_str)
        if not is_valid:
            return (False, error_msg)

        # Second check: verify required placeholders are provided
        placeholders = set(re.findall(r'\{(\w+)\}', self.command_template))
        required = placeholders - set(self.default_args.keys())
        missing = required - set(arguments.keys())

        return (True, "") if not missing else (False, f"Missing: {', '.join(missing)}")


class MCPServerToolExecutor(BaseExecutor):
    """Proxy tool calls to external MCP servers via HTTP."""

    def __init__(self, server_url: str, forward_args: bool = True, timeout: int = 10,
                 auth_username: str = None, auth_password: str = None,
                 auth_token: str = None, auth_token_basic: bool = False, verify_ssl: bool = True):
        self.server_url = server_url
        self.forward_args = forward_args
        self.timeout = timeout
        self.verify_ssl = verify_ssl
        self.auth = None
        self.auth_headers = {}

        # Use token auth if provided
        if auth_token:
            if auth_token_basic:
                # Drupal MCP uses Basic auth with base64-encoded token
                import base64
                encoded = base64.b64encode(auth_token.encode()).decode()
                self.auth_headers = {"Authorization": f"Basic {encoded}"}
            else:
                # Standard Bearer token auth
                self.auth_headers = {"Authorization": f"Bearer {auth_token}"}
        elif auth_username and auth_password:
            # Basic auth with username and password
            self.auth = httpx.BasicAuth(auth_username, auth_password)

    async def fetch_remote_tools(self) -> list:
        """Fetch available tools from the remote MCP server."""
        try:
            logger.info(f"Starting fetch_remote_tools from {self.server_url}")
            async with httpx.AsyncClient(timeout=self.timeout, verify=self.verify_ssl) as client:
                logger.info(
                    f"HTTP client created, sending request with timeout={self.timeout}s")
                response = await client.post(
                    self.server_url,
                    json={"jsonrpc": "2.0", "method": "tools/list",
                          "params": {}, "id": 1},
                    auth=self.auth,
                    headers=self.auth_headers
                )
                logger.info(
                    f"Received response with status {response.status_code}")
                response.raise_for_status()
                result = response.json()

                # Handle different response formats
                if isinstance(result, dict):
                    tools = result.get("tools", result.get(
                        "result", {}).get("tools", []))
                elif isinstance(result, list):
                    tools = result
                else:
                    logger.warning(
                        f"Unexpected response format from {self.server_url}")
                    return []

                logger.info(
                    f"Fetched {len(tools)} tools from {self.server_url}")
                return tools
        except Exception as e:
            logger.exception(
                f"Failed to fetch tools from {self.server_url}: {e}")
            return []

    async def execute(self, arguments: dict, tool_name: str = None) -> str:
        """Proxy call to MCP server.

        Args:
            arguments: Tool arguments to forward or {"method": "...", "params": {...}}
            tool_name: Optional tool name for MCP protocol calls
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=self.verify_ssl) as client:
                # Check if arguments contain a "method" key (JSON-RPC request)
                method_from_args = arguments.get(
                    "method") if isinstance(arguments, dict) else None

                if tool_name:
                    # Tool-specific call via MCP
                    payload = {
                        "jsonrpc": "2.0",
                        "method": "tools/call",
                        "params": {
                            "name": tool_name,
                            "arguments": arguments
                        },
                        "id": 1
                    }
                elif method_from_args:
                    # Direct JSON-RPC method call (e.g., {"method": "tools/list", "params": {}})
                    payload = {
                        "jsonrpc": "2.0",
                        "method": method_from_args,
                        "params": arguments.get("params", {}),
                        "id": 1
                    }
                else:
                    # Legacy: forward args directly
                    payload = arguments if self.forward_args else {}

                response = await client.post(
                    self.server_url,
                    json=payload,
                    auth=self.auth,
                    headers=self.auth_headers
                )
                response.raise_for_status()
                result = response.json()

                # Extract content from MCP response
                if isinstance(result, dict):
                    # Check for JSON-RPC result
                    if "result" in result:
                        return str(result.get("result", ""))
                    # Check for content array (MCP format)
                    content = result.get("content", [])
                    if isinstance(content, list) and content:
                        return content[0].get("text", str(result))
                    # Return error if present
                    if "error" in result:
                        return f"RPC Error: {result['error'].get('message', str(result['error']))}"
                    return str(result)

                return result if isinstance(result, str) else str(result)
        except httpx.TimeoutException:
            return f"Request timeout after {self.timeout}s"
        except httpx.HTTPError as e:
            return f"HTTP error: {e}"
        except Exception as e:
            logger.exception(f"MCP proxy error: {e}")
            return f"Error: {str(e)}"

    def validate_arguments(self, arguments: dict) -> Tuple[bool, str]:
        """MCP servers handle their own validation."""
        return True, ""
