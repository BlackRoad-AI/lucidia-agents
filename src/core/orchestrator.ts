import type { AgentResult } from './types/agent.js';
import type {
  Orchestrator,
  OrchestratorConfig,
  Task,
  TaskResult,
  OrchestratorStatus
} from './types/orchestrator.js';

/**
 * Orchestrator for managing and coordinating multiple agents
 */
export class AgentOrchestrator implements Orchestrator {
  private config: OrchestratorConfig;
  private agents: Map<string, string> = new Map();
  private taskQueue: Task[] = [];
  private runningTasks: Map<string, Task> = new Map();
  private completedTasks: Map<string, TaskResult> = new Map();
  private taskIdCounter = 0;
  private completedCount = 0;
  private failedCount = 0;

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      maxConcurrency: 5,
      defaultTimeoutMs: 30000,
      verbose: false,
      ...config
    };
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(name: string, agentPath: string): void {
    this.agents.set(name, agentPath);
    if (this.config.verbose) {
      console.log(`[Orchestrator] Registered agent: ${name}`);
    }
  }

  /**
   * Submit a task for execution
   */
  async submitTask(taskInput: Omit<Task, 'id'>): Promise<string> {
    const id = `task_${++this.taskIdCounter}_${Date.now()}`;
    const task: Task = {
      ...taskInput,
      id,
      priority: taskInput.priority ?? 0
    };

    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    if (this.config.verbose) {
      console.log(`[Orchestrator] Task submitted: ${id}`);
    }

    // Start processing if we have capacity
    this.processQueue();

    return id;
  }

  /**
   * Wait for a task to complete
   */
  async waitForTask(taskId: string): Promise<TaskResult> {
    // Check if already completed
    const completed = this.completedTasks.get(taskId);
    if (completed) {
      return completed;
    }

    // Poll until complete
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task ${taskId} timed out`));
      }, this.config.defaultTimeoutMs);

      const checkInterval = setInterval(() => {
        const result = this.completedTasks.get(taskId);
        if (result) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve(result);
        }
      }, 100);
    });
  }

  /**
   * Execute a task immediately and wait for result
   */
  async execute(agentName: string, input: string): Promise<AgentResult> {
    const taskId = await this.submitTask({ agentName, input });
    const result = await this.waitForTask(taskId);
    return result.result;
  }

  /**
   * Get orchestrator status
   */
  status(): OrchestratorStatus {
    return {
      queueLength: this.taskQueue.length,
      runningTasks: this.runningTasks.size,
      completedTasks: this.completedCount,
      failedTasks: this.failedCount
    };
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    this.taskQueue = [];
    if (this.config.verbose) {
      console.log('[Orchestrator] Shutdown complete');
    }
  }

  /**
   * Process tasks from the queue
   */
  private async processQueue(): Promise<void> {
    while (
      this.taskQueue.length > 0 &&
      this.runningTasks.size < (this.config.maxConcurrency ?? 5)
    ) {
      const task = this.taskQueue.shift();
      if (task) {
        this.executeTask(task);
      }
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: Task): Promise<void> {
    this.runningTasks.set(task.id, task);
    const startTime = Date.now();

    try {
      const agentPath = this.agents.get(task.agentName);
      if (!agentPath) {
        throw new Error(`Agent '${task.agentName}' not registered`);
      }

      // Dynamic import of the agent
      const agentModule = await import(agentPath);
      const agent = agentModule.default || agentModule;

      const context = {
        input: task.input,
        startTime,
        memory: {},
        config: agent.config || {}
      };

      const result = await agent.run(context);

      const taskResult: TaskResult = {
        taskId: task.id,
        agentName: task.agentName,
        result,
        executionTimeMs: Date.now() - startTime
      };

      this.completedTasks.set(task.id, taskResult);
      this.completedCount++;

      if (this.config.verbose) {
        console.log(`[Orchestrator] Task completed: ${task.id}`);
      }
    } catch (error) {
      const taskResult: TaskResult = {
        taskId: task.id,
        agentName: task.agentName,
        result: {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        executionTimeMs: Date.now() - startTime
      };

      this.completedTasks.set(task.id, taskResult);
      this.failedCount++;

      if (this.config.verbose) {
        console.log(`[Orchestrator] Task failed: ${task.id}`);
      }
    } finally {
      this.runningTasks.delete(task.id);
      this.processQueue();
    }
  }
}
