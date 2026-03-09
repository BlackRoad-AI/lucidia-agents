import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { AGENTS_DIR } from '../constants.js';

interface RunOptions {
  input: string | undefined;
  verbose: boolean;
  dryRun: boolean;
}

export function createRunCommand(): Command {
  const command = new Command('run')
    .description('Run an agent')
    .argument('<agent>', 'Name of the agent to run')
    .option('-i, --input <input>', 'Input to pass to the agent')
    .option('-v, --verbose', 'Enable verbose output', false)
    .option('--dry-run', 'Show what would be executed without running', false)
    .action(async (agent: string, options: RunOptions) => {
      await runAgent(agent, options);
    });

  return command;
}

async function runAgent(agentName: string, options: RunOptions): Promise<void> {
  const agentDir = join(process.cwd(), AGENTS_DIR);
  const tsPath = join(agentDir, `${agentName}.ts`);
  const jsPath = join(agentDir, `${agentName}.js`);

  const agentPath = existsSync(tsPath) ? tsPath : existsSync(jsPath) ? jsPath : null;

  if (!agentPath) {
    logger.error(`Agent '${agentName}' not found`);
    logger.dim(`  Looked in: ${agentDir}`);
    logger.info(`Create it with: lucidia agent create ${agentName}`);
    process.exit(1);
  }

  if (options.dryRun) {
    logger.heading('Dry run mode');
    console.log('');
    logger.table([
      ['Agent', agentName],
      ['Path', agentPath],
      ['Input', options.input || '(none)'],
      ['Verbose', options.verbose ? 'Yes' : 'No']
    ]);
    return;
  }

  const spinner = ora(`Running agent '${agentName}'...`).start();

  try {
    // Dynamic import of the agent
    const agentModule = await import(agentPath);
    const agent = agentModule.default || agentModule;

    if (!agent.run || typeof agent.run !== 'function') {
      throw new Error(`Agent '${agentName}' does not export a valid run function`);
    }

    const context = {
      input: options.input || '',
      startTime: Date.now(),
      memory: {},
      config: agent.config || {}
    };

    if (options.verbose) {
      spinner.info('Agent context:');
      console.log(JSON.stringify(context, null, 2));
    }

    spinner.text = 'Executing agent...';
    const result = await agent.run(context);

    spinner.succeed(`Agent '${agentName}' completed`);

    console.log('');
    logger.heading('Result:');
    console.log('');

    if (typeof result === 'object') {
      if (result.output) {
        console.log(result.output);
      }
      if (options.verbose && result.metadata) {
        console.log('');
        logger.dim('Metadata:');
        console.log(JSON.stringify(result.metadata, null, 2));
      }
    } else {
      console.log(result);
    }
  } catch (error) {
    spinner.fail(`Agent '${agentName}' failed`);
    logger.error(error instanceof Error ? error.message : 'Unknown error');

    if (options.verbose && error instanceof Error && error.stack) {
      console.log('');
      logger.dim(error.stack);
    }

    process.exit(1);
  }
}
