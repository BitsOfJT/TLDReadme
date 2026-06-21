#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fetchReadme } from './core/fetcher.js';
import { SYSTEM_PROMPT } from './core/prompt.js';

const server = new Server(
  { name: 'tldreadme', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'tldreadme_fetch',
      description:
        'Fetch a GitHub README and return it with summarization instructions. ' +
        'After calling this tool, use the returned content to generate a TLDR summary ' +
        'in the exact 5-section format provided, then call tldreadme_save with your result.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          input: {
            type: 'string',
            description:
              'A GitHub repository URL (e.g. https://github.com/user/repo) or raw README text',
          },
        },
        required: ['input'],
      },
    },
    {
      name: 'tldreadme_save',
      description:
        'Save a generated TLDR to TLDReadme.md in the current directory and print it to the terminal. ' +
        'Call this after generating the TLDR summary from tldreadme_fetch.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          tldr: {
            type: 'string',
            description: 'The complete TLDR summary to save',
          },
        },
        required: ['tldr'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'tldreadme_fetch') {
    const input = args?.input as string | undefined;
    if (!input?.trim()) {
      return {
        content: [{ type: 'text' as const, text: 'Error: input is required' }],
        isError: true,
      };
    }

    try {
      const readmeContent = await fetchReadme(input);
      const payload =
        `${SYSTEM_PROMPT}\n\n---\n\n` +
        `Here is the README to summarize:\n\n---\n\n` +
        `${readmeContent}\n\n---\n\n` +
        `Please produce the TLDR now, following the format exactly.`;
      return {
        content: [{ type: 'text' as const, text: payload }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'tldreadme_save') {
    const tldr = args?.tldr as string | undefined;
    if (!tldr?.trim()) {
      return {
        content: [{ type: 'text' as const, text: 'Error: tldr is required' }],
        isError: true,
      };
    }

    try {
      const filePath = join(process.cwd(), 'TLDReadme.md');
      await writeFile(filePath, tldr, 'utf-8');
      return {
        content: [{ type: 'text' as const, text: `TLDR saved to ${filePath}` }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
