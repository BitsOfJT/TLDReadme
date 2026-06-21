#!/usr/bin/env node
import { program } from 'commander';
import readline from 'readline';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fetchReadme } from './core/fetcher.js';
import { loadConfig, saveConfig, resolveProvider } from './core/config.js';
import { SYSTEM_PROMPT } from './core/prompt.js';
import { generate as generateClaude } from './core/llm/anthropic.js';
import { generate as generateOpenAI } from './core/llm/openai.js';
import { generate as generateGemini } from './core/llm/gemini.js';

const PROVIDERS = ['claude', 'openai', 'gemini', 'ollama'] as const;
type Provider = (typeof PROVIDERS)[number];

program
  .name('tldreadme')
  .description('Get a plain-English TLDR of any GitHub README')
  .argument('[input]', 'GitHub repo URL or raw README text (omit to paste via stdin)')
  .option('--provider <name>', 'Provider to use (claude|openai|gemini|ollama)')
  .option('--model <id>', 'Model ID to use (overrides provider default)')
  .action(async (input?: string, options?: { provider?: string; model?: string }) => {
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

      const { name: providerName, credentials } = await resolveProvider(options?.provider);

      console.log(`Generating TLDR with ${providerName}...`);

      const systemPrompt = SYSTEM_PROMPT;
      const userMessage = `Here is the README to summarize:\n\n---\n\n${readmeText}\n\n---\n\nPlease produce the TLDR now, following the format exactly.`;

      let tldr: string;
      switch (providerName) {
        case 'claude':
          tldr = await generateClaude(systemPrompt, userMessage, credentials, options?.model);
          break;
        case 'openai':
          tldr = await generateOpenAI(systemPrompt, userMessage, credentials, 'openai', options?.model);
          break;
        case 'ollama':
          tldr = await generateOpenAI(systemPrompt, userMessage, credentials, 'ollama', options?.model);
          break;
        case 'gemini':
          tldr = await generateGemini(systemPrompt, userMessage, credentials, options?.model);
          break;
        default:
          throw new Error(
            `Unknown provider: "${providerName}". Supported: claude, openai, gemini, ollama`
          );
      }

      console.log('\n' + tldr + '\n');
      const filePath = join(process.cwd(), 'TLDReadme.md');
      await writeFile(filePath, tldr, 'utf-8');
      console.log(`Saved to ${filePath}`);
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program
  .command('login <provider>')
  .description('Save credentials for a provider (claude, openai, gemini, ollama)')
  .action(async (providerArg: string) => {
    const provider = providerArg.toLowerCase();
    if (!PROVIDERS.includes(provider as Provider)) {
      console.error(`Unknown provider: "${provider}". Supported: ${PROVIDERS.join(', ')}`);
      process.exit(1);
    }

    const config = await loadConfig();

    if (provider === 'ollama') {
      const currentUrl = config.providers.ollama?.baseUrl ?? 'http://localhost:11434';
      const baseUrl = await promptLine(`Ollama base URL [${currentUrl}]: `);
      config.providers.ollama = { baseUrl: baseUrl || currentUrl };
    } else {
      const labels: Record<string, string> = {
        claude: 'Anthropic API key',
        openai: 'OpenAI API key',
        gemini: 'Google AI API key',
      };
      const apiKey = await promptLine(`${labels[provider]}: `);
      if (!apiKey) {
        console.error('Error: API key cannot be empty.');
        process.exit(1);
      }
      config.providers[provider] = { apiKey };
    }

    if (!config.defaultProvider) {
      config.defaultProvider = provider;
    }

    await saveConfig(config);

    const isDefault = config.defaultProvider === provider;
    console.log(
      isDefault
        ? `Saved. ${provider[0].toUpperCase() + provider.slice(1)} is now your default provider.`
        : `Saved. Run: tldreadme --provider ${provider} <url>`
    );
  });

program
  .command('logout <provider>')
  .description('Remove saved credentials for a provider')
  .action(async (providerArg: string) => {
    const provider = providerArg.toLowerCase();
    const config = await loadConfig();

    if (!config.providers[provider]) {
      console.error(`Provider "${provider}" is not configured.`);
      process.exit(1);
    }

    delete config.providers[provider];

    if (config.defaultProvider === provider) {
      const remaining = Object.keys(config.providers);
      config.defaultProvider = remaining[0];
    }

    await saveConfig(config);
    console.log(`Removed ${provider} credentials.`);
  });

program
  .command('providers')
  .description('List all configured providers')
  .action(async () => {
    const config = await loadConfig();
    for (const provider of PROVIDERS) {
      const configured = !!config.providers[provider];
      const isDefault = config.defaultProvider === provider;
      const status = configured ? `configured${isDefault ? ' (default)' : ''}` : '—';
      console.log(`  ${provider.padEnd(8)} ${status}`);
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

async function promptLine(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

program.parse();
