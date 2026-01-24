import {
  BaseProvider,
  type Message,
  type LLMResponse,
  type CompletionOptions,
  type StreamChunk,
  type ToolCall
} from './base-provider.js';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

interface AnthropicContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContent[];
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropic Claude API provider
 */
export class AnthropicProvider extends BaseProvider {
  readonly name = 'anthropic';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(options: { apiKey?: string; baseUrl?: string; defaultModel?: string } = {}) {
    super();
    this.apiKey = options.apiKey || process.env['ANTHROPIC_API_KEY'] || '';
    this.baseUrl = options.baseUrl || 'https://api.anthropic.com';
    this.defaultModel = options.defaultModel || 'claude-sonnet-4-20250514';
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.');
    }

    const { systemMessage, chatMessages } = this.extractSystemMessage(messages);

    const body: Record<string, unknown> = {
      model: options.model || this.defaultModel,
      messages: this.formatMessages(chatMessages),
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.7
    };

    if (systemMessage) {
      body['system'] = systemMessage;
    }

    if (options.tools && options.tools.length > 0) {
      body['tools'] = this.formatToolsForAnthropic(options.tools);
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json() as AnthropicResponse;
    return this.parseResponse(data);
  }

  async *stream(messages: Message[], options: CompletionOptions = {}): AsyncIterable<StreamChunk> {
    if (!this.isConfigured()) {
      throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.');
    }

    const { systemMessage, chatMessages } = this.extractSystemMessage(messages);

    const body: Record<string, unknown> = {
      model: options.model || this.defaultModel,
      messages: this.formatMessages(chatMessages),
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.7,
      stream: true
    };

    if (systemMessage) {
      body['system'] = systemMessage;
    }

    if (options.tools && options.tools.length > 0) {
      body['tools'] = this.formatToolsForAnthropic(options.tools);
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield { content: parsed.delta.text, done: false };
            } else if (parsed.type === 'message_stop') {
              yield { done: true };
              return;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    yield { done: true };
  }

  private extractSystemMessage(messages: Message[]): { systemMessage: string | null; chatMessages: Message[] } {
    const systemMessages = messages.filter(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    return {
      systemMessage: systemMessages.map(m => m.content).join('\n') || null,
      chatMessages
    };
  }

  private formatMessages(messages: Message[]): AnthropicMessage[] {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));
  }

  private formatToolsForAnthropic(tools: import('../core/types/tool.js').Tool[]): unknown[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }));
  }

  private parseResponse(data: AnthropicResponse): LLMResponse {
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of data.content) {
      if (block.type === 'text' && block.text) {
        content += block.text;
      } else if (block.type === 'tool_use' && block.id && block.name) {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input || {}
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: data.stop_reason === 'tool_use' ? 'tool_calls' :
                    data.stop_reason === 'max_tokens' ? 'length' : 'stop',
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      }
    };
  }
}
