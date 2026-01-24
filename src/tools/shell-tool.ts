import { exec } from 'child_process';
import { promisify } from 'util';
import { defineTool } from '../core/define-tool.js';

const execAsync = promisify(exec);

/**
 * Tool for executing shell commands
 */
export const shellTool = defineTool({
  name: 'shell',
  description: 'Execute a shell command and return the output. Use for running scripts, system commands, or CLI tools.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute'
      },
      cwd: {
        type: 'string',
        description: 'Working directory for the command (optional)'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)'
      }
    },
    required: ['command']
  },
  execute: async (params) => {
    const command = params['command'] as string;
    const cwd = params['cwd'] as string | undefined;
    const timeout = (params['timeout'] as number) || 30000;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });

      return {
        success: true,
        result: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0
        }
      };
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string; code?: number; message: string };
      return {
        success: false,
        error: execError.message,
        result: {
          stdout: execError.stdout || '',
          stderr: execError.stderr || '',
          exitCode: execError.code || 1
        }
      };
    }
  }
});
