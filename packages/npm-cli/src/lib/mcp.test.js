import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateCliMcpConfig, generateVscodeMcpConfig } from './mcp.js';

const WORKSPACE = '/workspace';

describe('generated MCP configs', () => {
  // The agent shares a container with the project source, so build/test/lint
  // tooling is a skill, not an MCP server. wdrmcp is not an option either: its
  // command/check executors require an ssh_target and a second container.
  it('registers only the remote Wunder Quality System server', () => {
    const servers = JSON.parse(generateCliMcpConfig({ workspaceFolder: WORKSPACE })).mcpServers;

    assert.deepEqual(Object.keys(servers), ['wunder-quality-system']);
    assert.equal(servers.wdrmcp, undefined);
    assert.equal(servers['node-agents'], undefined);
  });

  it('produces a VS Code config with only the WQS server', () => {
    const config = JSON.parse(generateVscodeMcpConfig({ workspaceFolder: WORKSPACE }));

    assert.deepEqual(Object.keys(config.servers), ['wunder-quality-system']);
    assert.equal(config.servers['wunder-quality-system'].gallery, 'https://mcp.wdr.io');
  });

  it('does not reference a removed local MCP server package', () => {
    for (const rendered of [
      generateCliMcpConfig({ workspaceFolder: WORKSPACE }),
      generateVscodeMcpConfig({ workspaceFolder: WORKSPACE })
    ]) {
      assert.doesNotMatch(rendered, /node-agents-mcp/);
    }
  });

  it('carries no DDEV-specific state into node projects', () => {
    for (const rendered of [
      generateCliMcpConfig({ workspaceFolder: WORKSPACE }),
      generateVscodeMcpConfig({ workspaceFolder: WORKSPACE })
    ]) {
      assert.doesNotMatch(rendered, /DDEV_PROJECT/);
      assert.doesNotMatch(rendered, /#ddev-generated/);
    }
  });

  it('leaves no unrendered template placeholders', () => {
    assert.doesNotMatch(generateCliMcpConfig({ workspaceFolder: WORKSPACE }), /\{\{\w+\}\}/);
    assert.doesNotMatch(generateVscodeMcpConfig({ workspaceFolder: WORKSPACE }), /\{\{\w+\}\}/);
  });
});
