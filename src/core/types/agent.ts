import type { Tool } from './tool.js';

/**
 * Configuration for an agent
 */
export interface AgentConfig {
  /** Unique name for the agent */
  name: string;

  /** Human-readable description of what this agent does */
  description: string;

  /** Version of the agent */
  version: string;

  /** Tools available to this agent */
  tools: Tool[];

  /** Agent-specific settings */
  settings: AgentSettings;

  /** For orchestrator agents: sub-agents that can be delegated to */
  subAgents?: string[];
}

/**
 * Settings that control agent behavior
 */
export interface AgentSettings {
  /** LLM model to use */
  model: string;

  /** Temperature for LLM sampling (0-1) */
  temperature?: number;

  /** Maximum tokens in response */
  maxTokens?: number;

  /** Maximum retries on failure */
  maxRetries?: number;

  /** Timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Context passed to an agent during execution
 */
export interface AgentContext {
  /** Input provided to the agent */
  input: string;

  /** Timestamp when execution started */
  startTime: number;

  /** Memory store for this execution */
  memory: Record<string, unknown>;

  /** The agent's configuration */
  config: AgentConfig;

  /** Optional: orchestrator interface for delegation */
  orchestrator?: OrchestratorInterface;
}

/**
 * Interface for delegating to other agents
 */
export interface OrchestratorInterface {
  /** Delegate a task to another agent */
  delegate: (agentName: string, task: string) => Promise<AgentResult>;

  /** Get available sub-agents */
  getAvailableAgents: () => string[];
}

/**
 * Result returned by an agent after execution
 */
export interface AgentResult {
  /** Whether the execution was successful */
  success: boolean;

  /** Output from the agent */
  output: string;

  /** Optional error message if success is false */
  error?: string;

  /** Execution metadata */
  metadata?: AgentMetadata;
}

/**
 * Metadata about agent execution
 */
export interface AgentMetadata {
  /** Time taken to execute in milliseconds */
  executionTimeMs?: number;

  /** Number of tokens used */
  tokensUsed?: number;

  /** Number of tool calls made */
  toolCalls?: number;

  /** Model used for execution */
  model?: string;

  /** Any additional custom metadata */
  [key: string]: unknown;
}

/**
 * The main Agent interface that all agents must implement
 */
export interface Agent {
  /** Agent configuration */
  config: AgentConfig;

  /** Main execution function */
  run: (context: AgentContext) => Promise<AgentResult>;
}
