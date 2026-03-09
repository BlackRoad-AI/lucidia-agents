import { Command } from 'commander';
import { createInterface } from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { getConfiguredProvider, getProvider, type Message } from '../../providers/index.js';
import { builtInTools } from '../../tools/index.js';
import { logger } from '../utils/logger.js';
import { BANNER } from '../constants.js';

interface ChatOptions {
  provider: string | undefined;
  model: string | undefined;
  system: string | undefined;
  tools: boolean;
  stream: boolean;
}

export function createChatCommand(): Command {
  const command = new Command('chat')
    .description('Start an interactive chat session with an AI agent')
    .option('-p, --provider <provider>', 'LLM provider to use (openai, anthropic)')
    .option('-m, --model <model>', 'Model to use')
    .option('-s, --system <prompt>', 'System prompt')
    .option('--no-tools', 'Disable built-in tools')
    .option('--no-stream', 'Disable streaming responses')
    .action(async (options: ChatOptions) => {
      await startChat(options);
    });

  return command;
}

async function startChat(options: ChatOptions): Promise<void> {
  console.log(chalk.cyan(BANNER));

  // Get provider
  let provider;
  try {
    if (options.provider) {
      provider = getProvider(options.provider);
    } else {
      provider = getConfiguredProvider();
    }

    if (!provider) {
      logger.error('No LLM provider configured.');
      logger.info('Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.');
      process.exit(1);
    }

    if (!provider.isConfigured()) {
      logger.error(`Provider ${provider.name} is not configured.`);
      process.exit(1);
    }
  } catch (error) {
    logger.error(error instanceof Error ? error.message : 'Failed to initialize provider');
    process.exit(1);
  }

  logger.success(`Connected to ${provider.name}`);
  if (options.model) {
    logger.dim(`  Model: ${options.model}`);
  }
  if (options.tools) {
    logger.dim(`  Tools: ${builtInTools.length} available`);
  }

  console.log('');
  logger.dim('Type your message and press Enter. Use /help for commands, /exit to quit.');
  console.log('');

  const messages: Message[] = [];

  // Add system message
  if (options.system) {
    messages.push({ role: 'system', content: options.system });
  } else {
    messages.push({
      role: 'system',
      content: `You are a helpful AI assistant called Lucidia. You are knowledgeable, concise, and helpful.${options.tools ? ' You have access to tools for shell commands, file operations, and web access.' : ''}`
    });
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () => {
    rl.question(chalk.green('you > '), async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      // Handle commands
      if (trimmed.startsWith('/')) {
        const handled = handleCommand(trimmed, messages);
        if (handled === 'exit') {
          rl.close();
          console.log('');
          logger.info('Goodbye!');
          process.exit(0);
        }
        prompt();
        return;
      }

      // Add user message
      messages.push({ role: 'user', content: trimmed });

      // Get response
      const spinner = ora({ text: 'Thinking...', color: 'cyan' }).start();

      try {
        if (options.stream) {
          spinner.stop();
          process.stdout.write(chalk.blue('lucidia > '));

          let fullResponse = '';
          for await (const chunk of provider.stream(messages, {
            model: options.model,
            tools: options.tools ? builtInTools : undefined
          })) {
            if (chunk.content) {
              process.stdout.write(chunk.content);
              fullResponse += chunk.content;
            }
          }
          console.log('\n');

          messages.push({ role: 'assistant', content: fullResponse });
        } else {
          const response = await provider.complete(messages, {
            model: options.model,
            tools: options.tools ? builtInTools : undefined
          });

          spinner.stop();

          // Handle tool calls
          if (response.toolCalls && response.toolCalls.length > 0) {
            await handleToolCalls(response.toolCalls, messages, provider, options);
          } else {
            console.log(chalk.blue('lucidia >'), response.content);
            console.log('');
            messages.push({ role: 'assistant', content: response.content });
          }
        }
      } catch (error) {
        spinner.fail('Error');
        logger.error(error instanceof Error ? error.message : 'Unknown error');
        console.log('');
      }

      prompt();
    });
  };

  prompt();
}

function handleCommand(input: string, messages: Message[]): string | null {
  const [cmd, ...args] = input.slice(1).split(' ');

  switch (cmd?.toLowerCase()) {
    case 'exit':
    case 'quit':
    case 'q':
      return 'exit';

    case 'help':
    case 'h':
      console.log('');
      logger.heading('Commands:');
      console.log('  /help, /h       Show this help');
      console.log('  /clear, /c      Clear conversation history');
      console.log('  /history        Show conversation history');
      console.log('  /system <msg>   Set system prompt');
      console.log('  /tools          List available tools');
      console.log('  /exit, /q       Exit chat');
      console.log('');
      return null;

    case 'clear':
    case 'c':
      // Keep only system message
      const system = messages.find(m => m.role === 'system');
      messages.length = 0;
      if (system) messages.push(system);
      logger.success('Conversation cleared');
      console.log('');
      return null;

    case 'history':
      console.log('');
      logger.heading('Conversation History:');
      for (const msg of messages) {
        const role = msg.role === 'user' ? chalk.green('you') :
                     msg.role === 'assistant' ? chalk.blue('lucidia') :
                     chalk.yellow(msg.role);
        const content = msg.content.length > 100 ?
          msg.content.slice(0, 100) + '...' : msg.content;
        console.log(`  ${role}: ${content}`);
      }
      console.log('');
      return null;

    case 'system':
      if (args.length > 0) {
        const systemMsg = messages.find(m => m.role === 'system');
        const newContent = args.join(' ');
        if (systemMsg) {
          systemMsg.content = newContent;
        } else {
          messages.unshift({ role: 'system', content: newContent });
        }
        logger.success('System prompt updated');
      } else {
        const systemMsg = messages.find(m => m.role === 'system');
        if (systemMsg) {
          console.log(chalk.dim('System:'), systemMsg.content);
        } else {
          logger.info('No system prompt set');
        }
      }
      console.log('');
      return null;

    case 'tools':
      console.log('');
      logger.heading('Available Tools:');
      for (const tool of builtInTools) {
        console.log(`  ${chalk.cyan(tool.name.padEnd(15))} ${tool.description}`);
      }
      console.log('');
      return null;

    default:
      logger.warn(`Unknown command: ${cmd}`);
      console.log('');
      return null;
  }
}

async function handleToolCalls(
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>,
  messages: Message[],
  provider: ReturnType<typeof getProvider>,
  options: ChatOptions
): Promise<void> {
  for (const call of toolCalls) {
    console.log(chalk.yellow(`[Using tool: ${call.name}]`));

    const tool = builtInTools.find(t => t.name === call.name);
    if (!tool) {
      messages.push({
        role: 'tool',
        content: `Error: Tool ${call.name} not found`,
        toolCallId: call.id
      });
      continue;
    }

    try {
      const result = await tool.execute(call.arguments);
      const resultStr = JSON.stringify(result, null, 2);
      console.log(chalk.dim(resultStr.slice(0, 500) + (resultStr.length > 500 ? '...' : '')));

      messages.push({
        role: 'tool',
        content: resultStr,
        toolCallId: call.id
      });
    } catch (error) {
      messages.push({
        role: 'tool',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolCallId: call.id
      });
    }
  }

  // Get follow-up response after tool calls
  const spinner = ora({ text: 'Processing...', color: 'cyan' }).start();
  try {
    const response = await provider.complete(messages, {
      model: options.model,
      tools: options.tools ? builtInTools : undefined
    });

    spinner.stop();

    if (response.toolCalls && response.toolCalls.length > 0) {
      // Recursive tool call handling
      await handleToolCalls(response.toolCalls, messages, provider, options);
    } else {
      console.log(chalk.blue('lucidia >'), response.content);
      console.log('');
      messages.push({ role: 'assistant', content: response.content });
    }
  } catch (error) {
    spinner.fail('Error');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
  }
}
