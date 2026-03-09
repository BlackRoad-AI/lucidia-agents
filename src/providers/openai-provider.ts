import {
  BaseProvider,
  type Message,
  type LLMResponse,
  type CompletionOptions,
  type StreamChunk,
  type ToolCall
} from './base-provider.js';

interface OpenAIMessage {
  role: string;
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenAIToolCall[];
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAIResponse {
  id: string;
  choices: Array<{
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI API provider
 */
export class OpenAIProvider extends BaseProvider {
  readonly name = 'openai';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(options: { apiKey?: string; baseUrl?: string; defaultModel?: string } = {}) {
    super();
    this.apiKey = options.apiKey || process.env['OPENAI_API_KEY'] || '';
    this.baseUrl = options.baseUrl || 'https://api.openai.com/v1';
    this.defaultModel = options.defaultModel || 'gpt-4';
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async complete(messages: Message[], options: CompletionOptions = {}): Promise<LLMResponse> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }

    const body: Record<string, unknown> = {
      model: options.model || this.defaultModel,
      messages: this.formatMessages(messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000
    };

    if (options.tools && options.tools.length > 0) {
      body['tools'] = this.formatTools(options.tools);
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json() as OpenAIResponse;
    return this.parseResponse(data);
  }

  async *stream(messages: Message[], options: CompletionOptions = {}): AsyncIterable<StreamChunk> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }

    const body: Record<string, unknown> = {
      model: options.model || this.defaultModel,
      messages: this.formatMessages(messages),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      stream: true
    };

    if (options.tools && options.tools.length > 0) {
      body['tools'] = this.formatTools(options.tools);
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
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
          if (data === '[DONE]') {
            yield { done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              yield { content: delta.content, done: false };
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    yield { done: true };
  }

  private formatMessages(messages: Message[]): OpenAIMessage[] {
    return messages.map(msg => {
      const formatted: OpenAIMessage = {
        role: msg.role,
        content: msg.content
      };
      if (msg.name) formatted.name = msg.name;
      if (msg.toolCallId) formatted.tool_call_id = msg.toolCallId;
      return formatted;
    });
  }

  private parseResponse(data: OpenAIResponse): LLMResponse {
    const choice = data.choices[0];
    if (!choice) {
      throw new Error('No response from OpenAI');
    }

    const toolCalls: ToolCall[] | undefined = choice.message.tool_calls?.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments)
    }));

    return {
      content: choice.message.content || '',
      toolCalls,
      finishReason: choice.finish_reason === 'tool_calls' ? 'tool_calls' :
                    choice.finish_reason === 'length' ? 'length' : 'stop',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined
    };
  }
}
