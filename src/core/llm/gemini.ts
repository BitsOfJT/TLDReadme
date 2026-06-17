import { GoogleGenAI } from '@google/genai';
import type { ProviderCredentials } from '../config.js';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export async function generate(
  systemPrompt: string,
  userMessage: string,
  credentials: ProviderCredentials,
  model?: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: credentials.apiKey });

  const response = await ai.models.generateContent({
    model: model ?? DEFAULT_MODEL,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 1024,
    },
  });

  return response.text ?? '';
}
