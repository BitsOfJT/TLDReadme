import OpenAI from 'openai';
import type { ProviderCredentials } from '../config.js';

const DEFAULT_MODEL_OPENAI = 'gpt-4o';

export async function generate(
  systemPrompt: string,
  userMessage: string,
  credentials: ProviderCredentials,
  provider: 'openai' | 'ollama',
  model?: string
): Promise<string> {
  if (provider === 'ollama' && !model) {
    throw new Error(
      'Ollama requires a model. Use --model to specify one (e.g. --model llama3).'
    );
  }

  const client = new OpenAI({
    apiKey: provider === 'ollama' ? 'ollama' : credentials.apiKey,
    baseURL:
      provider === 'ollama'
        ? (credentials.baseUrl ?? 'http://localhost:11434/v1')
        : undefined,
  });

  const response = await client.chat.completions.create({
    model: model ?? DEFAULT_MODEL_OPENAI,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  return response.choices[0]?.message.content ?? '';
}
