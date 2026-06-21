import type { ProviderCredentials } from '../config.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';

export async function generate(
  systemPrompt: string,
  userMessage: string,
  credentials: ProviderCredentials,
  model?: string
): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': credentials.apiKey!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model ?? DEFAULT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return (
    data.content
      ?.filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('') ?? ''
  );
}
