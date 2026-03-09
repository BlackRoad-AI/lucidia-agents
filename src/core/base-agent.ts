import type { Agent, AgentConfig, AgentContext, AgentResult } from './types/agent.js';

/**
 * Base class for creating agents with common functionality
 */
export abstract class BaseAgent implements Agent {
  public readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Main execution method - must be implemented by subclasses
   */
  abstract run(context: AgentContext): Promise<AgentResult>;

  /**
   * Helper to create a successful result
   */
  protected success(output: string, metadata?: Record<string, unknown>): AgentResult {
    return {
      success: true,
      output,
      metadata
    };
  }

  /**
   * Helper to create a failure result
   */
  protected failure(error: string, metadata?: Record<string, unknown>): AgentResult {
    return {
      success: false,
      output: '',
      error,
      metadata
    };
  }

  /**
   * Get a tool by name
   */
  protected getTool(name: string) {
    return this.config.tools.find(t => t.name === name);
  }

  /**
   * Execute a tool by name
   */
  protected async executeTool(name: string, params: Record<string, unknown>) {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }
    return tool.execute(params);
  }
}
