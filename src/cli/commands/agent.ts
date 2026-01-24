import { Command } from 'commander';
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { AGENTS_DIR } from '../constants.js';

interface CreateOptions {
  template: string;
  directory: string;
}

export function createAgentCommand(): Command {
  const command = new Command('agent')
    .description('Manage agents');

  command
    .command('create <name>')
    .description('Create a new agent')
    .option('-t, --template <template>', 'Agent template to use', 'basic')
    .option('-d, --directory <dir>', 'Directory to create agent in', AGENTS_DIR)
    .action(async (name: string, options: CreateOptions) => {
      await createAgent(name, options);
    });

  command
    .command('list')
    .alias('ls')
    .description('List all agents in the project')
    .action(async () => {
      await listAgents();
    });

  command
    .command('info <name>')
    .description('Show detailed information about an agent')
    .action(async (name: string) => {
      await showAgentInfo(name);
    });

  return command;
}

async function createAgent(name: string, options: CreateOptions): Promise<void> {
  const agentDir = join(process.cwd(), options.directory);
  const agentPath = join(agentDir, `${name}.ts`);

  if (existsSync(agentPath)) {
    logger.error(`Agent '${name}' already exists at ${agentPath}`);
    process.exit(1);
  }

  const spinner = ora(`Creating agent '${name}'...`).start();

  try {
    // Ensure directory exists
    if (!existsSync(agentDir)) {
      mkdirSync(agentDir, { recursive: true });
    }

    // Get template
    const template = getAgentTemplate(name, options.template);
    writeFileSync(agentPath, template);

    spinner.succeed(`Agent '${name}' created!`);
    logger.dim(`  Location: ${agentPath}`);

    console.log('');
    logger.heading('Next steps:');
    logger.list([
      `Edit ${agentPath} to implement your agent logic`,
      `Run 'lucidia run ${name}' to test your agent`
    ]);
  } catch (error) {
    spinner.fail('Failed to create agent');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

async function listAgents(): Promise<void> {
  const agentDir = join(process.cwd(), AGENTS_DIR);

  if (!existsSync(agentDir)) {
    logger.warn('No agents directory found. Run `lucidia init` first.');
    return;
  }

  const files = readdirSync(agentDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

  if (files.length === 0) {
    logger.info('No agents found. Create one with `lucidia agent create <name>`');
    return;
  }

  logger.heading('Agents:');
  console.log('');

  files.forEach(file => {
    const name = basename(file, file.endsWith('.ts') ? '.ts' : '.js');
    console.log(`  ${name}`);
  });

  console.log('');
  logger.dim(`  Total: ${files.length} agent(s)`);
}

async function showAgentInfo(name: string): Promise<void> {
  const agentDir = join(process.cwd(), AGENTS_DIR);
  const tsPath = join(agentDir, `${name}.ts`);
  const jsPath = join(agentDir, `${name}.js`);

  const agentPath = existsSync(tsPath) ? tsPath : existsSync(jsPath) ? jsPath : null;

  if (!agentPath) {
    logger.error(`Agent '${name}' not found`);
    logger.dim(`  Looked in: ${agentDir}`);
    return;
  }

  logger.heading(`Agent: ${name}`);
  console.log('');
  logger.table([
    ['Location', agentPath],
    ['Status', 'Ready']
  ]);
}

function getAgentTemplate(name: string, template: string): string {
  const templates: Record<string, string> = {
    basic: `import { Agent, AgentConfig, AgentContext, AgentResult } from 'lucidia';

export const config: AgentConfig = {
  name: '${name}',
  description: 'Description of ${name}',
  version: '1.0.0',
  tools: [],
  settings: {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  }
};

export async function run(context: AgentContext): Promise<AgentResult> {
  const { input } = context;

  // TODO: Implement your agent logic here

  return {
    success: true,
    output: \`Agent ${name} received: \${input}\`,
    metadata: {
      executionTimeMs: Date.now() - context.startTime
    }
  };
}

export default { config, run } satisfies Agent;
`,
    tool: `import { Agent, AgentConfig, AgentContext, AgentResult, Tool } from 'lucidia';

// Define tools for this agent
const tools: Tool[] = [
  {
    name: 'example_tool',
    description: 'An example tool that the agent can use',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The query to process' }
      },
      required: ['query']
    },
    execute: async (params) => {
      return { result: \`Processed: \${params.query}\` };
    }
  }
];

export const config: AgentConfig = {
  name: '${name}',
  description: 'An agent with tool capabilities',
  version: '1.0.0',
  tools,
  settings: {
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000
  }
};

export async function run(context: AgentContext): Promise<AgentResult> {
  const { input } = context;

  // TODO: Implement agent logic with tool usage

  return {
    success: true,
    output: \`Agent ${name} completed task\`,
    metadata: {
      executionTimeMs: Date.now() - context.startTime
    }
  };
}

export default { config, run } satisfies Agent;
`,
    orchestrator: `import { Agent, AgentConfig, AgentContext, AgentResult } from 'lucidia';

export const config: AgentConfig = {
  name: '${name}',
  description: 'An orchestrator agent that coordinates other agents',
  version: '1.0.0',
  tools: [],
  settings: {
    model: 'gpt-4',
    temperature: 0.3,
    maxTokens: 2000
  },
  subAgents: [
    // List sub-agents this orchestrator can delegate to
  ]
};

export async function run(context: AgentContext): Promise<AgentResult> {
  const { input, orchestrator } = context;

  // TODO: Implement orchestration logic
  // Use orchestrator.delegate(agentName, task) to delegate to sub-agents

  return {
    success: true,
    output: 'Orchestration complete',
    metadata: {
      executionTimeMs: Date.now() - context.startTime
    }
  };
}

export default { config, run } satisfies Agent;
`
  };

  return templates[template] || templates['basic']!;
}
