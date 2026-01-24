import chalk from 'chalk';

export const logger = {
  info: (message: string) => {
    console.log(chalk.blue('ℹ'), message);
  },

  success: (message: string) => {
    console.log(chalk.green('✓'), message);
  },

  warn: (message: string) => {
    console.log(chalk.yellow('⚠'), message);
  },

  error: (message: string) => {
    console.log(chalk.red('✗'), message);
  },

  dim: (message: string) => {
    console.log(chalk.dim(message));
  },

  heading: (message: string) => {
    console.log(chalk.bold.cyan(message));
  },

  list: (items: string[]) => {
    items.forEach(item => {
      console.log(chalk.dim('  •'), item);
    });
  },

  table: (rows: Array<[string, string]>) => {
    const maxKeyLen = Math.max(...rows.map(([key]) => key.length));
    rows.forEach(([key, value]) => {
      console.log(`  ${chalk.cyan(key.padEnd(maxKeyLen))}  ${value}`);
    });
  }
};
