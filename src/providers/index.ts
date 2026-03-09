export type {
  Message,
  ToolCall,
  LLMResponse,
  CompletionOptions,
  StreamChunk,
  LLMProvider
} from './base-provider.js';

export { BaseProvider } from './base-provider.js';
export { OpenAIProvider } from './openai-provider.js';
export { AnthropicProvider } from './anthropic-provider.js';

import { OpenAIProvider } from './openai-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import type { LLMProvider } from './base-provider.js';

/**
 * Get a provider by name
 */
export function getProvider(name: string): LLMProvider {
  switch (name.toLowerCase()) {
    case 'openai':
    case 'gpt':
    case 'gpt-4':
    case 'gpt-3.5':
      return new OpenAIProvider();
    case 'anthropic':
    case 'claude':
      return new AnthropicProvider();
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

/**
 * Get the first configured provider
 */
export function getConfiguredProvider(): LLMProvider | null {
  const providers = [
    new AnthropicProvider(),
    new OpenAIProvider()
  ];

  for (const provider of providers) {
    if (provider.isConfigured()) {
      return provider;
    }
  }

  return null;
}

/**
 * List all available providers with their configuration status
 */
export function listProviders(): Array<{ name: string; configured: boolean }> {
  return [
    { name: 'openai', configured: new OpenAIProvider().isConfigured() },
    { name: 'anthropic', configured: new AnthropicProvider().isConfigured() }
  ];
}
