import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { CONFIG_FILE } from '../constants.js';

export function createConfigCommand(): Command {
  const command = new Command('config')
    .description('Manage project configuration');

  command
    .command('get [key]')
    .description('Get configuration value(s)')
    .action(async (key?: string) => {
      await getConfig(key);
    });

  command
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key: string, value: string) => {
      await setConfig(key, value);
    });

  command
    .command('show')
    .description('Show full configuration')
    .action(async () => {
      await showConfig();
    });

  return command;
}

async function getConfig(key?: string): Promise<void> {
  const config = loadConfig();
  if (!config) return;

  if (!key) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  const value = getNestedValue(config, key);
  if (value === undefined) {
    logger.warn(`Key '${key}' not found in configuration`);
    return;
  }

  if (typeof value === 'object') {
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(value);
  }
}

async function setConfig(key: string, value: string): Promise<void> {
  const configPath = join(process.cwd(), CONFIG_FILE);
  const config = loadConfig();
  if (!config) return;

  // Try to parse as JSON, otherwise use string
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    parsedValue = value;
  }

  setNestedValue(config, key, parsedValue);
  writeFileSync(configPath, JSON.stringify(config, null, 2));

  logger.success(`Set ${key} = ${JSON.stringify(parsedValue)}`);
}

async function showConfig(): Promise<void> {
  const config = loadConfig();
  if (!config) return;

  logger.heading('Configuration');
  console.log('');
  console.log(JSON.stringify(config, null, 2));
}

function loadConfig(): Record<string, unknown> | null {
  const configPath = join(process.cwd(), CONFIG_FILE);

  if (!existsSync(configPath)) {
    logger.warn('No Lucidia project found. Run `lucidia init` first.');
    return null;
  }

  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1]!;
  current[lastKey] = value;
}
