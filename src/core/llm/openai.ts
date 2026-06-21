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

  const apiKey = provider === 'ollama' ? 'ollama' : credentials.apiKey;
  let baseURL =
    provider === 'ollama'
      ? (credentials.baseUrl ?? 'http://localhost:11434/v1')
      : 'https://api.openai.com/v1';

  if (provider === 'ollama' && credentials.baseUrl && !baseURL.endsWith('/v1')) {
    baseURL = baseURL.replace(/\/?$/, '/v1');
  }

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model ?? DEFAULT_MODEL_OPENAI,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`${provider} API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
