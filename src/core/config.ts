import { readFile, writeFile, mkdir, chmod } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
}

export interface TldreadmeConfig {
  defaultProvider?: string;
  providers: Record<string, ProviderCredentials>;
}

const CONFIG_PATH = join(homedir(), '.config', 'tldreadme', 'config.json');

export async function loadConfig(): Promise<TldreadmeConfig> {
  try {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(content) as TldreadmeConfig;
  } catch {
    return { providers: {} };
  }
}

export async function saveConfig(config: TldreadmeConfig): Promise<void> {
  const configDir = join(homedir(), '.config', 'tldreadme');
  await mkdir(configDir, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  await chmod(CONFIG_PATH, 0o600);
}

export async function resolveProvider(
  flagValue?: string
): Promise<{ name: string; credentials: ProviderCredentials }> {
  const config = await loadConfig();
  const name = flagValue ?? config.defaultProvider ?? Object.keys(config.providers)[0];

  if (!name) {
    throw new Error(
      'No provider configured. Run: tldreadme login <provider>\n' +
        'Supported providers: claude, openai, gemini, ollama'
    );
  }

  const credentials = config.providers[name];
  if (!credentials) {
    throw new Error(`Provider "${name}" is not configured. Run: tldreadme login ${name}`);
  }

  return { name, credentials };
}
