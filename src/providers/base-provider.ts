import type { Tool } from '../core/types/tool.js';

/**
 * Message in a conversation
 */
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

/**
 * Tool call requested by the LLM
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Response from the LLM
 */
export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Options for LLM completion
 */
export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  stream?: boolean;
}

/**
 * Stream chunk from LLM
 */
export interface StreamChunk {
  content?: string;
  toolCalls?: ToolCall[];
  done: boolean;
}

/**
 * Base interface for LLM providers
 */
export interface LLMProvider {
  readonly name: string;

  /**
   * Generate a completion
   */
  complete(messages: Message[], options?: CompletionOptions): Promise<LLMResponse>;

  /**
   * Generate a streaming completion
   */
  stream(messages: Message[], options?: CompletionOptions): AsyncIterable<StreamChunk>;

  /**
   * Check if the provider is configured and ready
   */
  isConfigured(): boolean;
}

/**
 * Base class with common functionality
 */
export abstract class BaseProvider implements LLMProvider {
  abstract readonly name: string;

  abstract complete(messages: Message[], options?: CompletionOptions): Promise<LLMResponse>;

  abstract stream(messages: Message[], options?: CompletionOptions): AsyncIterable<StreamChunk>;

  abstract isConfigured(): boolean;

  /**
   * Convert tools to provider-specific format
   */
  protected formatTools(tools: Tool[]): unknown[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }
}
