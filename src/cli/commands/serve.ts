import { Command } from 'commander';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { logger } from '../utils/logger.js';
import { getConfiguredProvider, getProvider, type Message, type LLMProvider } from '../../providers/index.js';
import { builtInTools } from '../../tools/index.js';
import { existsSync } from 'fs';
import { join } from 'path';
import { AGENTS_DIR } from '../constants.js';

interface ServeOptions {
  port: number;
  host: string;
  provider: string | undefined;
  cors: boolean;
}

export function createServeCommand(): Command {
  const command = new Command('serve')
    .description('Start an HTTP API server for agents')
    .option('-p, --port <port>', 'Port to listen on', '3000')
    .option('-h, --host <host>', 'Host to bind to', 'localhost')
    .option('--provider <provider>', 'LLM provider to use')
    .option('--cors', 'Enable CORS', false)
    .action(async (options: ServeOptions) => {
      await startServer({
        ...options,
        port: parseInt(String(options.port), 10)
      });
    });

  return command;
}

async function startServer(options: ServeOptions): Promise<void> {
  // Get provider
  let provider: LLMProvider | null = null;
  try {
    if (options.provider) {
      provider = getProvider(options.provider);
    } else {
      provider = getConfiguredProvider();
    }

    if (!provider || !provider.isConfigured()) {
      logger.warn('No LLM provider configured. Some endpoints will be unavailable.');
    }
  } catch {
    logger.warn('Failed to initialize provider. Some endpoints will be unavailable.');
  }

  const server = createServer(async (req, res) => {
    // CORS headers
    if (options.cors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
    }

    res.setHeader('Content-Type', 'application/json');

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;

    try {
      // Routes
      if (path === '/' && req.method === 'GET') {
        handleRoot(res);
      } else if (path === '/health' && req.method === 'GET') {
        handleHealth(res, provider);
      } else if (path === '/chat' && req.method === 'POST') {
        await handleChat(req, res, provider);
      } else if (path === '/agents' && req.method === 'GET') {
        handleListAgents(res);
      } else if (path.startsWith('/agents/') && req.method === 'POST') {
        await handleRunAgent(req, res, path);
      } else if (path === '/tools' && req.method === 'GET') {
        handleListTools(res);
      } else if (path.startsWith('/tools/') && req.method === 'POST') {
        await handleRunTool(req, res, path);
      } else {
        sendError(res, 404, 'Not Found');
      }
    } catch (error) {
      logger.error(error instanceof Error ? error.message : 'Server error');
      sendError(res, 500, error instanceof Error ? error.message : 'Internal Server Error');
    }
  });

  server.listen(options.port, options.host, () => {
    console.log('');
    logger.success(`Lucidia API server running`);
    logger.info(`  http://${options.host}:${options.port}`);
    console.log('');
    logger.heading('Endpoints:');
    console.log('  GET  /           API info');
    console.log('  GET  /health     Health check');
    console.log('  POST /chat       Chat completion');
    console.log('  GET  /agents     List agents');
    console.log('  POST /agents/:n  Run agent');
    console.log('  GET  /tools      List tools');
    console.log('  POST /tools/:n   Execute tool');
    console.log('');
    logger.dim('Press Ctrl+C to stop');
  });
}

function handleRoot(res: ServerResponse): void {
  sendJson(res, {
    name: 'Lucidia API',
    version: '0.1.0',
    endpoints: [
      'GET /',
      'GET /health',
      'POST /chat',
      'GET /agents',
      'POST /agents/:name',
      'GET /tools',
      'POST /tools/:name'
    ]
  });
}

function handleHealth(res: ServerResponse, provider: LLMProvider | null): void {
  sendJson(res, {
    status: 'ok',
    provider: provider ? {
      name: provider.name,
      configured: provider.isConfigured()
    } : null
  });
}

async function handleChat(
  req: IncomingMessage,
  res: ServerResponse,
  provider: LLMProvider | null
): Promise<void> {
  if (!provider || !provider.isConfigured()) {
    sendError(res, 503, 'No LLM provider configured');
    return;
  }

  const body = await parseBody(req);

  if (!body.messages || !Array.isArray(body.messages)) {
    sendError(res, 400, 'messages array is required');
    return;
  }

  const messages: Message[] = body.messages;
  const model = body.model as string | undefined;
  const useTools = body.tools !== false;

  const response = await provider.complete(messages, {
    model,
    tools: useTools ? builtInTools : undefined,
    temperature: body.temperature as number | undefined,
    maxTokens: body.maxTokens as number | undefined
  });

  sendJson(res, {
    content: response.content,
    toolCalls: response.toolCalls,
    finishReason: response.finishReason,
    usage: response.usage
  });
}

function handleListAgents(res: ServerResponse): void {
  const agentDir = join(process.cwd(), AGENTS_DIR);
  const agents: Array<{ name: string; path: string }> = [];

  if (existsSync(agentDir)) {
    const { readdirSync } = require('fs');
    const files = readdirSync(agentDir).filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of files) {
      agents.push({
        name: file.replace(/\.(ts|js)$/, ''),
        path: join(agentDir, file)
      });
    }
  }

  sendJson(res, { agents });
}

async function handleRunAgent(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
  const agentName = path.replace('/agents/', '');
  const agentDir = join(process.cwd(), AGENTS_DIR);
  const tsPath = join(agentDir, `${agentName}.ts`);
  const jsPath = join(agentDir, `${agentName}.js`);

  const agentPath = existsSync(tsPath) ? tsPath : existsSync(jsPath) ? jsPath : null;

  if (!agentPath) {
    sendError(res, 404, `Agent '${agentName}' not found`);
    return;
  }

  const body = await parseBody(req);
  const input = body.input as string || '';

  try {
    const agentModule = await import(agentPath);
    const agent = agentModule.default || agentModule;

    const context = {
      input,
      startTime: Date.now(),
      memory: {},
      config: agent.config || {}
    };

    const result = await agent.run(context);
    sendJson(res, result);
  } catch (error) {
    sendError(res, 500, error instanceof Error ? error.message : 'Agent execution failed');
  }
}

function handleListTools(res: ServerResponse): void {
  const tools = builtInTools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }));

  sendJson(res, { tools });
}

async function handleRunTool(req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
  const toolName = path.replace('/tools/', '');
  const tool = builtInTools.find(t => t.name === toolName);

  if (!tool) {
    sendError(res, 404, `Tool '${toolName}' not found`);
    return;
  }

  const body = await parseBody(req);

  try {
    const result = await tool.execute(body);
    sendJson(res, result);
  } catch (error) {
    sendError(res, 500, error instanceof Error ? error.message : 'Tool execution failed');
  }
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, data: unknown): void {
  res.writeHead(200);
  res.end(JSON.stringify(data, null, 2));
}

function sendError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status);
  res.end(JSON.stringify({ error: message }));
}
