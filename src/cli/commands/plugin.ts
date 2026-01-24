import { Command } from 'commander';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { pluginManager } from '../../plugins/index.js';

export function createPluginCommand(): Command {
  const command = new Command('plugin')
    .description('Manage plugins');

  command
    .command('list')
    .alias('ls')
    .description('List installed plugins')
    .action(async () => {
      await listPlugins();
    });

  command
    .command('load <name>')
    .description('Load a plugin')
    .action(async (name: string) => {
      await loadPlugin(name);
    });

  command
    .command('unload <name>')
    .description('Unload a plugin')
    .action(async (name: string) => {
      await unloadPlugin(name);
    });

  command
    .command('discover')
    .description('Discover available plugins')
    .action(async () => {
      await discoverPlugins();
    });

  command
    .command('info <name>')
    .description('Show plugin information')
    .action(async (name: string) => {
      await pluginInfo(name);
    });

  return command;
}

async function listPlugins(): Promise<void> {
  const plugins = pluginManager.getPluginInfo();

  if (plugins.length === 0) {
    logger.info('No plugins loaded');
    logger.dim('  Use `lucidia plugin discover` to find available plugins');
    return;
  }

  logger.heading('Loaded Plugins');
  console.log('');

  for (const plugin of plugins) {
    const status = plugin.enabled ? '✓' : '○';
    console.log(`  ${status} ${plugin.name}@${plugin.version}`);
    if (plugin.description) {
      logger.dim(`    ${plugin.description}`);
    }
    logger.dim(`    Tools: ${plugin.tools}, Providers: ${plugin.providers}`);
  }

  console.log('');
}

async function loadPlugin(name: string): Promise<void> {
  const spinner = ora(`Loading plugin '${name}'...`).start();

  try {
    const plugin = await pluginManager.loadPlugin(name);
    spinner.succeed(`Plugin '${plugin.meta.name}' loaded`);

    if (plugin.tools && plugin.tools.length > 0) {
      logger.dim(`  Tools: ${plugin.tools.map(t => t.name).join(', ')}`);
    }
    if (plugin.providers && plugin.providers.length > 0) {
      logger.dim(`  Providers: ${plugin.providers.map(p => p.name).join(', ')}`);
    }
  } catch (error) {
    spinner.fail('Failed to load plugin');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
  }
}

async function unloadPlugin(name: string): Promise<void> {
  const spinner = ora(`Unloading plugin '${name}'...`).start();

  try {
    await pluginManager.unloadPlugin(name);
    spinner.succeed(`Plugin '${name}' unloaded`);
  } catch (error) {
    spinner.fail('Failed to unload plugin');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
  }
}

async function discoverPlugins(): Promise<void> {
  const spinner = ora('Discovering plugins...').start();

  try {
    const discovered = await pluginManager.discoverPlugins();
    spinner.succeed(`Found ${discovered.length} plugin(s)`);

    if (discovered.length > 0) {
      console.log('');
      for (const path of discovered) {
        console.log(`  ${path}`);
      }
      console.log('');
      logger.dim('Use `lucidia plugin load <path>` to load a plugin');
    }
  } catch (error) {
    spinner.fail('Failed to discover plugins');
    logger.error(error instanceof Error ? error.message : 'Unknown error');
  }
}

async function pluginInfo(name: string): Promise<void> {
  const plugin = pluginManager.getPlugin(name);

  if (!plugin) {
    logger.error(`Plugin '${name}' not loaded`);
    return;
  }

  logger.heading(`Plugin: ${plugin.meta.name}`);
  console.log('');

  console.log(`  Version:     ${plugin.meta.version}`);
  if (plugin.meta.description) {
    console.log(`  Description: ${plugin.meta.description}`);
  }
  if (plugin.meta.author) {
    console.log(`  Author:      ${plugin.meta.author}`);
  }

  if (plugin.tools && plugin.tools.length > 0) {
    console.log('');
    logger.heading('Tools:');
    for (const tool of plugin.tools) {
      console.log(`  ${tool.name.padEnd(20)} ${tool.description}`);
    }
  }

  if (plugin.providers && plugin.providers.length > 0) {
    console.log('');
    logger.heading('Providers:');
    for (const provider of plugin.providers) {
      console.log(`  ${provider.name.padEnd(20)} ${provider.isConfigured() ? '(configured)' : '(not configured)'}`);
    }
  }

  console.log('');
}
