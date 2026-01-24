import type { AgentResult } from './agent.js';

/**
 * Configuration for the orchestrator
 */
export interface OrchestratorConfig {
  /** Maximum concurrent agent executions */
  maxConcurrency?: number;

  /** Default timeout for tasks in ms */
  defaultTimeoutMs?: number;

  /** Whether to enable detailed logging */
  verbose?: boolean;
}

/**
 * A task to be executed by an agent
 */
export interface Task {
  /** Unique identifier for this task */
  id: string;

  /** Name of the agent to execute this task */
  agentName: string;

  /** Input for the task */
  input: string;

  /** Priority (lower = higher priority) */
  priority?: number;

  /** Dependencies on other task IDs */
  dependsOn?: string[];

  /** Task timeout in ms */
  timeoutMs?: number;
}

/**
 * Result of a task execution
 */
export interface TaskResult {
  /** Task ID */
  taskId: string;

  /** Agent that executed the task */
  agentName: string;

  /** Result from the agent */
  result: AgentResult;

  /** Time taken in ms */
  executionTimeMs: number;
}

/**
 * Status of the orchestrator
 */
export interface OrchestratorStatus {
  /** Number of tasks in queue */
  queueLength: number;

  /** Number of currently running tasks */
  runningTasks: number;

  /** Total tasks completed */
  completedTasks: number;

  /** Total tasks failed */
  failedTasks: number;
}

/**
 * Orchestrator interface for managing multiple agents
 */
export interface Orchestrator {
  /** Register an agent with the orchestrator */
  registerAgent: (name: string, agentPath: string) => void;

  /** Submit a task for execution */
  submitTask: (task: Omit<Task, 'id'>) => Promise<string>;

  /** Wait for a task to complete */
  waitForTask: (taskId: string) => Promise<TaskResult>;

  /** Execute a task immediately and wait for result */
  execute: (agentName: string, input: string) => Promise<AgentResult>;

  /** Get orchestrator status */
  status: () => OrchestratorStatus;

  /** Shutdown the orchestrator */
  shutdown: () => Promise<void>;
}
