#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import { createAgentCommand } from './commands/agent.js';
import { createRunCommand } from './commands/run.js';
import { createInitCommand } from './commands/init.js';
import { createListCommand } from './commands/list.js';
import { createConfigCommand } from './commands/config.js';
import { createChatCommand } from './commands/chat.js';
import { createServeCommand } from './commands/serve.js';
import { createPluginCommand } from './commands/plugin.js';
import { VERSION, BANNER } from './constants.js';

// Load environment variables
config();

const program = new Command();

program
  .name('lucidia')
  .description('AI agents framework for creating and orchestrating intelligent autonomous agents')
  .version(VERSION, '-v, --version', 'Display version number')
  .addHelpText('beforeAll', BANNER);

// Register commands
program.addCommand(createInitCommand());
program.addCommand(createAgentCommand());
program.addCommand(createRunCommand());
program.addCommand(createListCommand());
program.addCommand(createConfigCommand());
program.addCommand(createChatCommand());
program.addCommand(createServeCommand());
program.addCommand(createPluginCommand());

// Default action - show help with banner
program.action(() => {
  console.log(BANNER);
  console.log('');
  program.help();
});

program.parse();
