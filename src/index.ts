// Lucidia Agents Framework
// Main entry point for library consumers

// Core types
export type {
  Agent,
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentMetadata
} from './core/types/agent.js';

export type {
  Tool,
  ToolConfig,
  ToolResult,
  ToolParameters
} from './core/types/tool.js';

export type {
  Memory,
  MemoryEntry,
  MemoryConfig
} from './core/types/memory.js';

export type {
  Orchestrator,
  OrchestratorConfig,
  TaskResult
} from './core/types/orchestrator.js';

// Core classes
export { BaseAgent } from './core/base-agent.js';
export { ToolRegistry } from './core/tool-registry.js';
export { MemoryManager } from './core/memory-manager.js';
export { AgentOrchestrator } from './core/orchestrator.js';

// Utilities
export { createAgent } from './core/create-agent.js';
export { defineTool } from './core/define-tool.js';

// Providers
export type {
  Message,
  ToolCall,
  LLMResponse,
  CompletionOptions,
  StreamChunk,
  LLMProvider
} from './providers/index.js';

export {
  BaseProvider,
  OpenAIProvider,
  AnthropicProvider,
  getProvider,
  getConfiguredProvider,
  listProviders
} from './providers/index.js';

// Built-in tools
export {
  shellTool,
  fileReadTool,
  fileWriteTool,
  fileListTool,
  fileDeleteTool,
  webFetchTool,
  webSearchTool,
  builtInTools,
  getBuiltInTool,
  getBuiltInTools,
  toolCategories
} from './tools/index.js';

// Plugins
export type { Plugin, PluginMeta } from './plugins/index.js';
export { PluginManager, pluginManager } from './plugins/index.js';

// Version
export const VERSION = '0.1.0';
