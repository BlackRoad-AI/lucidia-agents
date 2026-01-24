import { readFile, writeFile, readdir, stat, mkdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { defineTool } from '../core/define-tool.js';

/**
 * Tool for reading files
 */
export const fileReadTool = defineTool({
  name: 'file_read',
  description: 'Read the contents of a file. Returns the file content as text.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read'
      },
      encoding: {
        type: 'string',
        description: 'File encoding (default: utf-8)'
      }
    },
    required: ['path']
  },
  execute: async (params) => {
    const path = params['path'] as string;
    const encoding = (params['encoding'] as BufferEncoding) || 'utf-8';

    try {
      const content = await readFile(path, { encoding });
      return {
        success: true,
        result: {
          content,
          path,
          size: content.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read file'
      };
    }
  }
});

/**
 * Tool for writing files
 */
export const fileWriteTool = defineTool({
  name: 'file_write',
  description: 'Write content to a file. Creates the file if it does not exist, or overwrites if it does.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to write'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      },
      createDirs: {
        type: 'boolean',
        description: 'Create parent directories if they do not exist (default: true)'
      }
    },
    required: ['path', 'content']
  },
  execute: async (params) => {
    const path = params['path'] as string;
    const content = params['content'] as string;
    const createDirs = params['createDirs'] !== false;

    try {
      if (createDirs) {
        await mkdir(dirname(path), { recursive: true });
      }

      await writeFile(path, content, 'utf-8');
      return {
        success: true,
        result: {
          path,
          bytesWritten: content.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to write file'
      };
    }
  }
});

/**
 * Tool for listing directory contents
 */
export const fileListTool = defineTool({
  name: 'file_list',
  description: 'List contents of a directory. Returns file and directory names.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory to list'
      },
      recursive: {
        type: 'boolean',
        description: 'List recursively (default: false)'
      }
    },
    required: ['path']
  },
  execute: async (params) => {
    const path = params['path'] as string;
    const recursive = params['recursive'] === true;

    try {
      const entries = await listDirectory(path, recursive);
      return {
        success: true,
        result: {
          path,
          entries,
          count: entries.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list directory'
      };
    }
  }
});

/**
 * Tool for deleting files
 */
export const fileDeleteTool = defineTool({
  name: 'file_delete',
  description: 'Delete a file.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to delete'
      }
    },
    required: ['path']
  },
  execute: async (params) => {
    const path = params['path'] as string;

    try {
      await unlink(path);
      return {
        success: true,
        result: { path, deleted: true }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file'
      };
    }
  }
});

interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
}

async function listDirectory(dirPath: string, recursive: boolean): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = [];
  const items = await readdir(dirPath);

  for (const item of items) {
    const itemPath = join(dirPath, item);
    const stats = await stat(itemPath);
    const entry: DirectoryEntry = {
      name: item,
      path: itemPath,
      type: stats.isDirectory() ? 'directory' : 'file'
    };

    if (stats.isFile()) {
      entry.size = stats.size;
    }

    entries.push(entry);

    if (recursive && stats.isDirectory()) {
      const subEntries = await listDirectory(itemPath, true);
      entries.push(...subEntries);
    }
  }

  return entries;
}
