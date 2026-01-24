import type { Tool, ToolParameters, ToolResult } from './types/tool.js';

interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameters;
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

/**
 * Helper function to define a tool with type safety
 */
export function defineTool(definition: ToolDefinition): Tool {
  return {
    name: definition.name,
    description: definition.description,
    parameters: definition.parameters,
    execute: definition.execute
  };
}
