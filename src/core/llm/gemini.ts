import type { ProviderCredentials } from '../config.js';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export async function generate(
  systemPrompt: string,
  userMessage: string,
  credentials: ProviderCredentials,
  model?: string
): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${
      model ?? DEFAULT_MODEL
    }:generateContent?key=${encodeURIComponent(credentials.apiKey!)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
