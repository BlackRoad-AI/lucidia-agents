import { Command } from 'commander';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { CONFIG_FILE, AGENTS_DIR } from '../constants.js';

interface InitOptions {
  force: boolean;
}

export function createInitCommand(): Command {
  const command = new Command('init')
    .description('Initialize a new Lucidia project in the current directory')
    .option('-f, --force', 'Overwrite existing configuration', false)
    .action(async (options: InitOptions) => {
      await initProject(options);
    });

  return command;
}

async function initProject(options: InitOptions): Promise<void> {
  const cwd = process.cwd();
  const configPath = join(cwd, CONFIG_FILE);
  const agentsPath = join(cwd, AGENTS_DIR);

  // Check if already initialized
  if (existsSync(configPath) && !options.force) {
    logger.warn(`Project already initialized. Use --force to reinitialize.`);
    return;
  }

  const spinner = ora('Initializing Lucidia project...').start();

  try {
    // Create config file
    const config = {
      name: 'my-lucidia-project',
      version: '0.1.0',
      agents: {},
      settings: {
        defaultModel: 'gpt-4',
        logLevel: 'info',
        maxRetries: 3,
        timeoutMs: 30000
      }
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Create agents directory
    if (!existsSync(agentsPath)) {
      mkdirSync(agentsPath, { recursive: true });
    }

    // Create example agent
    const exampleAgentPath = join(agentsPath, 'example-agent.ts');
    if (!existsSync(exampleAgentPath) || options.force) {
      writeFileSync(exampleAgentPath, EXAMPLE_AGENT_TEMPLATE);
    }

    spinner.succeed('Lucidia project initialized!');

    console.log('');
    logger.heading('Created:');
    logger.list([
      `${CONFIG_FILE} - Project configuration`,
      `${AGENTS_DIR}/ - Agent definitions directory`,
      `${AGENTS_DIR}/example-agent.ts - Example agent template`
    ]);

    console.log('');
    logger.heading('Next steps:');
    logger.list([
      'Edit lucidia.config.json to configure your project',
      'Create agents in the agents/ directory',
      'Run `lucidia agent create <name>` to scaffold a new agent',
      'Run `lucidia run <agent>` to execute an agent'
    ]);
  } catch (error) {
    spinner.fail('Failed to initialize project');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

const EXAMPLE_AGENT_TEMPLATE = `import { Agent, AgentConfig, AgentContext, AgentResult } from 'lucidia';

/**
 * Example agent that demonstrates the basic structure.
 * Customize this template to create your own agents.
 */
export const config: AgentConfig = {
  name: 'example-agent',
  description: 'An example agent that greets the user',
  version: '1.0.0',
  tools: [],
  settings: {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  }
};

export async function run(context: AgentContext): Promise<AgentResult> {
  const { input, memory } = context;

  // Your agent logic here
  const response = \`Hello! You said: "\${input}". I'm an example Lucidia agent.\`;

  return {
    success: true,
    output: response,
    metadata: {
      tokensUsed: 0,
      executionTimeMs: Date.now() - context.startTime
    }
  };
}

export default { config, run } satisfies Agent;
`;
