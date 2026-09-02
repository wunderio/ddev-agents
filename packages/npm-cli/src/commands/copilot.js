import { invokeCopilot } from '@wunderio/agents-core';

export async function copilot({ projectRoot, args = [] }) {
  return invokeCopilot({ workspaceFolder: projectRoot, args });
}
