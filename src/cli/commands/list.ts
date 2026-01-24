import { Command } from 'commander';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { CONFIG_FILE, AGENTS_DIR } from '../constants.js';

interface ListOptions {
  json: boolean;
}

export function createListCommand(): Command {
  const command = new Command('list')
    .alias('ls')
    .description('List project resources')
    .option('--json', 'Output as JSON', false);

  command
    .command('agents')
    .description('List all agents')
    .action(async () => {
      await listAgents();
    });

  command
    .command('tools')
    .description('List available tools')
    .action(async () => {
      await listTools();
    });

  command.action(async (options: ListOptions) => {
    await listAll(options);
  });

  return command;
}

async function listAll(options: ListOptions): Promise<void> {
  const cwd = process.cwd();
  const configPath = join(cwd, CONFIG_FILE);

  if (!existsSync(configPath)) {
    logger.warn('No Lucidia project found. Run `lucidia init` first.');
    return;
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const agentDir = join(cwd, AGENTS_DIR);
  const agents = existsSync(agentDir)
    ? readdirSync(agentDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'))
    : [];

  if (options.json) {
    console.log(JSON.stringify({
      project: config.name,
      version: config.version,
      agents: agents.map(f => f.replace(/\.(ts|js)$/, '')),
      settings: config.settings
    }, null, 2));
    return;
  }

  logger.heading('Project Overview');
  console.log('');

  logger.table([
    ['Name', config.name || 'unnamed'],
    ['Version', config.version || '0.0.0'],
    ['Agents', agents.length.toString()]
  ]);

  if (agents.length > 0) {
    console.log('');
    logger.heading('Agents:');
    agents.forEach(file => {
      const name = file.replace(/\.(ts|js)$/, '');
      console.log(`  ${name}`);
    });
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
    logger.info('No agents found.');
    logger.dim('  Create one with: lucidia agent create <name>');
    return;
  }

  logger.heading('Agents');
  console.log('');

  files.forEach(file => {
    const name = file.replace(/\.(ts|js)$/, '');
    console.log(`  ${name}`);
  });

  console.log('');
  logger.dim(`  ${files.length} agent(s) found`);
}

async function listTools(): Promise<void> {
  // Built-in tools that will be available
  const builtInTools = [
    { name: 'web-search', description: 'Search the web for information' },
    { name: 'web-fetch', description: 'Fetch content from a URL' },
    { name: 'file-read', description: 'Read file contents' },
    { name: 'file-write', description: 'Write content to a file' },
    { name: 'shell', description: 'Execute shell commands' },
    { name: 'code-execute', description: 'Execute code in a sandboxed environment' }
  ];

  logger.heading('Built-in Tools');
  console.log('');

  builtInTools.forEach(tool => {
    console.log(`  ${tool.name.padEnd(15)} ${tool.description}`);
  });

  console.log('');
  logger.dim('  Use `lucidia tool info <name>` for more details');
}
