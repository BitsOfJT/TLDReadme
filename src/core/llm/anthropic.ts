import Anthropic from '@anthropic-ai/sdk';
import type { ProviderCredentials } from '../config.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';

export async function generate(
  systemPrompt: string,
  userMessage: string,
  credentials: ProviderCredentials,
  model?: string
): Promise<string> {
  const client = new Anthropic({ apiKey: credentials.apiKey });

  const message = await client.messages.create({
    model: model ?? DEFAULT_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}
