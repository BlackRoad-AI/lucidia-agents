// Built-in tools for Lucidia agents

export { shellTool } from './shell-tool.js';
export {
  fileReadTool,
  fileWriteTool,
  fileListTool,
  fileDeleteTool
} from './file-tool.js';
export { webFetchTool, webSearchTool } from './web-tool.js';

import { shellTool } from './shell-tool.js';
import { fileReadTool, fileWriteTool, fileListTool, fileDeleteTool } from './file-tool.js';
import { webFetchTool, webSearchTool } from './web-tool.js';
import type { Tool } from '../core/types/tool.js';

/**
 * All built-in tools
 */
export const builtInTools: Tool[] = [
  shellTool,
  fileReadTool,
  fileWriteTool,
  fileListTool,
  fileDeleteTool,
  webFetchTool,
  webSearchTool
];

/**
 * Get a built-in tool by name
 */
export function getBuiltInTool(name: string): Tool | undefined {
  return builtInTools.find(t => t.name === name);
}

/**
 * Get multiple built-in tools by name
 */
export function getBuiltInTools(names: string[]): Tool[] {
  return names.map(name => getBuiltInTool(name)).filter((t): t is Tool => t !== undefined);
}

/**
 * Tool categories for easy discovery
 */
export const toolCategories = {
  shell: [shellTool],
  file: [fileReadTool, fileWriteTool, fileListTool, fileDeleteTool],
  web: [webFetchTool, webSearchTool]
} as const;
