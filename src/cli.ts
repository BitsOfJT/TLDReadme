#!/usr/bin/env node
import { program } from 'commander';
import Anthropic from '@anthropic-ai/sdk';
import { fetchReadme } from './core/fetcher.js';
import { SYSTEM_PROMPT, buildUserMessage } from './core/prompt.js';
import { writeTldr } from './core/writer.js';

program
  .name('tldreadme')
  .description('Get a plain-English TLDR of any GitHub README')
  .argument('[input]', 'GitHub repo URL or raw README text (omit to paste via stdin)')
  .action(async (input?: string) => {
    try {
      let readmeText: string;

      if (input) {
        readmeText = await fetchReadme(input);
      } else {
        readmeText = await readStdin();
      }

      if (!readmeText.trim()) {
        console.error('Error: No README content provided.');
        process.exit(1);
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
        console.error('Get your API key at https://console.anthropic.com');
        process.exit(1);
      }

      const client = new Anthropic({ apiKey });

      console.log('Generating TLDR...');

      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(readmeText) }],
      });

      const tldr = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const filePath = await writeTldr(tldr);
      console.log(`Saved to ${filePath}`);
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    if (process.stdin.isTTY) {
      console.log('Paste your README below, then press Ctrl+D when done:\n');
    }
  });
}

program.parse();
