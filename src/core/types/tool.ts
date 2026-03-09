/**
 * JSON Schema for tool parameters
 */
export interface ToolParameters {
  type: 'object';
  properties: Record<string, ParameterSchema>;
  required?: string[];
}

/**
 * Schema for a single parameter
 */
export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: ParameterSchema;
}

/**
 * Result of a tool execution
 */
export interface ToolResult {
  /** Whether the tool executed successfully */
  success?: boolean;

  /** Result data from the tool */
  result?: unknown;

  /** Error message if execution failed */
  error?: string;

  /** Any additional data */
  [key: string]: unknown;
}

/**
 * Configuration for a tool
 */
export interface ToolConfig {
  /** Maximum execution time in ms */
  timeoutMs?: number;

  /** Whether to retry on failure */
  retry?: boolean;

  /** Maximum number of retries */
  maxRetries?: number;
}

/**
 * A tool that an agent can use
 */
export interface Tool {
  /** Unique name for the tool */
  name: string;

  /** Human-readable description of what the tool does */
  description: string;

  /** JSON schema defining the tool's parameters */
  parameters: ToolParameters;

  /** Function to execute the tool */
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;

  /** Optional configuration */
  config?: ToolConfig;
}
