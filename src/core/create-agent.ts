import type { Agent, AgentConfig, AgentContext, AgentResult } from './types/agent.js';

/**
 * Helper function to create an agent with type safety
 */
export function createAgent(
  config: AgentConfig,
  runFn: (context: AgentContext) => Promise<AgentResult>
): Agent {
  return {
    config,
    run: runFn
  };
}
