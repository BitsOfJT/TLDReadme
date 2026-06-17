import { SYSTEM_PROMPT, buildUserMessage } from '../prompt.js';
import type { ProviderCredentials } from '../config.js';

export async function generateTldr(
  provider: string,
  model: string | undefined,
  readmeText: string,
  credentials: ProviderCredentials
): Promise<string> {
  const systemPrompt = SYSTEM_PROMPT;
  const userMessage = buildUserMessage(readmeText);

  switch (provider) {
    case 'claude': {
      const { generate } = await import('./anthropic.js');
      return generate(systemPrompt, userMessage, credentials, model);
    }
    case 'openai': {
      const { generate } = await import('./openai.js');
      return generate(systemPrompt, userMessage, credentials, 'openai', model);
    }
    case 'ollama': {
      const { generate } = await import('./openai.js');
      return generate(systemPrompt, userMessage, credentials, 'ollama', model);
    }
    case 'gemini': {
      const { generate } = await import('./gemini.js');
      return generate(systemPrompt, userMessage, credentials, model);
    }
    default:
      throw new Error(
        `Unknown provider: "${provider}". Supported: claude, openai, gemini, ollama`
      );
  }
}
