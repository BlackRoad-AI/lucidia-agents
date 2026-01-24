import { defineTool } from '../core/define-tool.js';

/**
 * Tool for fetching web content
 */
export const webFetchTool = defineTool({
  name: 'web_fetch',
  description: 'Fetch content from a URL. Returns the response body as text.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch'
      },
      method: {
        type: 'string',
        description: 'HTTP method (default: GET)',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      },
      headers: {
        type: 'object',
        description: 'HTTP headers to include'
      },
      body: {
        type: 'string',
        description: 'Request body (for POST/PUT/PATCH)'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)'
      }
    },
    required: ['url']
  },
  execute: async (params) => {
    const url = params['url'] as string;
    const method = (params['method'] as string) || 'GET';
    const headers = (params['headers'] as Record<string, string>) || {};
    const body = params['body'] as string | undefined;
    const timeout = (params['timeout'] as number) || 30000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      let content: string;

      if (contentType.includes('application/json')) {
        const json = await response.json();
        content = JSON.stringify(json, null, 2);
      } else {
        content = await response.text();
      }

      // Truncate very long responses
      const maxLength = 50000;
      const truncated = content.length > maxLength;
      if (truncated) {
        content = content.slice(0, maxLength) + '\n... (truncated)';
      }

      return {
        success: response.ok,
        result: {
          status: response.status,
          statusText: response.statusText,
          contentType,
          content,
          truncated,
          url: response.url
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch URL'
      };
    }
  }
});

/**
 * Tool for web search (using DuckDuckGo HTML)
 */
export const webSearchTool = defineTool({
  name: 'web_search',
  description: 'Search the web using DuckDuckGo. Returns search results.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query'
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5)'
      }
    },
    required: ['query']
  },
  execute: async (params) => {
    const query = params['query'] as string;
    const maxResults = (params['maxResults'] as number) || 5;

    try {
      // Use DuckDuckGo HTML search
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LucidiaBot/1.0)'
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();

      // Parse results from HTML (basic extraction)
      const results = parseSearchResults(html, maxResults);

      return {
        success: true,
        result: {
          query,
          results,
          count: results.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }
});

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function parseSearchResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  // Basic regex-based extraction of search results
  // Look for result links and their snippets
  const resultPattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/gi;

  let match;
  while ((match = resultPattern.exec(html)) !== null && results.length < maxResults) {
    const url = match[1] || '';
    const title = (match[2] || '').trim();
    const snippet = (match[3] || '').replace(/<[^>]+>/g, '').trim();

    if (url && title) {
      results.push({ title, url, snippet });
    }
  }

  // Fallback: simpler pattern if above doesn't match
  if (results.length === 0) {
    const simplePattern = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*class="[^"]*result[^"]*"[^>]*>([^<]+)<\/a>/gi;

    while ((match = simplePattern.exec(html)) !== null && results.length < maxResults) {
      results.push({
        title: (match[2] || '').trim(),
        url: match[1] || '',
        snippet: ''
      });
    }
  }

  return results;
}
