# Bugs — code review of multi-provider commit (786db7f)

Review by `ecc:code-reviewer`. **Nothing here is fixed yet** — this file lists the findings and options for each so they can be triaged.

| # | Severity | Summary | Location |
|---|----------|---------|----------|
| 1 | High | Ollama breaks with the default login URL (missing `/v1`) | `src/cli.ts:58,60` + `src/core/llm/openai.ts:23` |
| 2 | Medium | `ANTHROPIC_API_KEY` env-var auth removed — CI/headless regression | `src/core/config.ts:42-47`; README.md:38,116 |
| 3 | Medium | Corrupted `config.json` silently overwritten — data loss | `src/core/config.ts:19-26` + `28-34` |
| 4 | Low | `promptSecret` backspace only matches DEL (0x7f), not BS (0x08) | `src/cli.ts:177` |
| 5 | Low | Ollama "model required" error surfaces only after README fetch | `src/cli.ts:22→36` + `src/core/llm/openai.ts:13-17` |
| 6 | Low | `max_tokens` deprecated; fails for o1/o3-series models | `src/core/llm/openai.ts:29` |
| 7 | Low (UX) | Empty LLM response writes an empty `TLDReadme.md` with no warning | all three adapters |

---

## 1. Ollama breaks with the default login URL (missing `/v1`) — HIGH

**Symptom:** Anyone who runs `tldreadme login ollama` and accepts the default URL gets `Error: 404 ...` on every request.

**What's wrong:** At login the default is `http://localhost:11434` (no `/v1`):

```ts
// src/cli.ts:58
const currentUrl = config.providers.ollama?.baseUrl ?? 'http://localhost:11434';
// src/cli.ts:60 — user accepts default → saves 'http://localhost:11434'
config.providers.ollama = { baseUrl: baseUrl || currentUrl };
```

The adapter only appends `/v1` as a fallback *when `credentials.baseUrl` is absent* — but login always writes `baseUrl`, so the fallback is unreachable:

```ts
// src/core/llm/openai.ts:23
? (credentials.baseUrl ?? 'http://localhost:11434/v1')  // fallback never used after login
```

The OpenAI SDK then POSTs to `http://localhost:11434/chat/completions`. Ollama serves its OpenAI-compatible endpoint at `/v1/chat/completions`, so without the prefix it returns 404.

**Fix options:**
1. Change the login default to `http://localhost:11434/v1` (`src/cli.ts:58`) so the saved value matches what the SDK needs.
2. Normalize in the adapter: if `credentials.baseUrl` doesn't end in `/v1`, append it before passing to the OpenAI client.
3. Drop the `?? '...'` fallback and derive baseURL as `${credentials.baseUrl.replace(/\/$/, '')}/v1`.

---

## 2. `ANTHROPIC_API_KEY` env-var auth removed — MEDIUM (regression)

**Symptom:** A new user following the README (`export ANTHROPIC_API_KEY=...`) hits `No provider configured`. CI pipelines that relied on the env var break with no migration path.

**What's wrong:** The previous CLI authenticated purely via `ANTHROPIC_API_KEY`. The new flow requires interactive `tldreadme login claude`, which writes to `~/.config/tldreadme/config.json`. `resolveProvider` (`src/core/config.ts:42-47`) throws *before* any adapter runs, so even with `ANTHROPIC_API_KEY` exported the command fails. The Anthropic adapter (`src/core/llm/anthropic.ts:12`) passes `credentials.apiKey` explicitly, so the SDK's own env-var fallback never engages either. The README still documents the env var at `README.md:38` and `README.md:116`.

**Fix options:**
1. In `resolveProvider`, fall back to `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`GOOGLE_API_KEY` env vars when no saved config exists — synthesizes credentials without requiring `login`.
2. Support both: env var wins for a provider if that provider isn't in config.
3. Keep config-only, but update the README to remove the `export ANTHROPIC_API_KEY` lines and document `tldreadme login` instead (fixes stale docs, not the CI regression).

---

## 3. Corrupted `config.json` silently overwritten — MEDIUM (data loss)

**Symptom:** If `config.json` is ever truncated/corrupted (interrupted write, bad manual edit, disk issue), all saved credentials are lost on the next `login` with no warning.

**What's wrong:** `loadConfig` catches every error and returns an empty config:

```ts
// src/core/config.ts:19-26
export async function loadConfig(): Promise<TldreadmeConfig> {
  try {
    const content = await readFile(getConfigPath(), 'utf-8');
    return JSON.parse(content) as TldreadmeConfig;
  } catch {
    return { providers: {} };   // parse error → treated as empty config
  }
}
```

The next `login` merges the new provider into that empty config and `saveConfig` overwrites the file (`config.ts:32`) — all previously saved keys are gone. The same catch also swallows valid-JSON-but-wrong-shape configs (e.g. `{ "providers": "oops" }`), producing confusing downstream errors instead of a clear "config corrupted, re-login" message.

**Fix options:**
1. Distinguish `ENOENT` (legitimately missing → return empty) from other errors (parse/permission → throw an actionable message, refuse to overwrite).
2. On non-ENOENT errors, back up the corrupt file to `config.json.corrupt` before any `saveConfig` runs.
3. Validate the parsed shape in `loadConfig` and throw if `providers` is not an object.

---

## 4. `promptSecret` backspace only matches DEL (0x7f), not BS (0x08) — LOW

**Symptom:** On terminals whose `stty erase` is `^H` (some Linux consoles, certain SSH configs), pressing Backspace doesn't erase — it appends a literal `0x08` byte to the API key. The corrupted key is saved and every later call fails with an opaque "invalid api key" from the provider.

**What's wrong:**

```ts
// src/cli.ts:177
} else if (char === '\x7f') {   // only DEL, not BS
```

**Fix options:**
1. Match both: `else if (char === '\x7f' || char === '\x08')`.
2. Compare by char code for clarity: `char.charCodeAt(0) === 127 || char.charCodeAt(0) === 8`.

---

## 5. Ollama "model required" error surfaces only after README fetch — LOW (wasteful)

**Symptom:** `tldreadme --provider ollama <github-url>` with no `--model` fetches the README from GitHub, then prints "Generating TLDR with ollama...", then errors. The fetch was wasted.

**What's wrong:** The README fetch (`src/cli.ts:22`) runs before `generateTldr` (`src/cli.ts:36`), where the model-required check lives (`src/core/llm/openai.ts:13-17`). Not broken — just unnecessary work and a slightly confusing failure sequence.

**Fix options:**
1. Validate `--model` for ollama in the CLI action (`src/cli.ts`, before line 22) before fetching the README.
2. Move the model-required check into `resolveProvider` or a pre-flight validation step.

---

## 6. `max_tokens` deprecated; fails for o1/o3-series models — LOW

**Symptom:** `tldreadme --provider openai --model o1-mini <url>` → OpenAI API rejects `max_tokens` with a 400. Default `gpt-4o` works fine.

**What's wrong:** The installed OpenAI SDK (`openai@6.43.0`) types mark `max_tokens` as deprecated in favor of `max_completion_tokens`. For `gpt-4o` the API still accepts `max_tokens`, so this is invisible by default. Only bites if a user passes an `o1`/`o3`/`o4` reasoning model. Ollama is unaffected (it accepts `max_tokens`).

```ts
// src/core/llm/openai.ts:29
max_tokens: 1024,
```

**Fix options:**
1. Use `max_completion_tokens` when the model looks like a reasoning model (`o1`/`o3`/`o4` prefix), else `max_tokens`.
2. Always send `max_completion_tokens` (accepted by current `gpt-4o` too) and drop `max_tokens`.

---

## 7. Empty LLM response writes an empty `TLDReadme.md` with no warning — LOW (UX)

**Symptom:** If the provider returns an empty response (e.g. Gemini safety-filter blocks it, or an empty `choices[0].message.content`), the CLI writes an empty `TLDReadme.md` and prints `Saved to ...` as if it succeeded.

**What's wrong:** All three adapters normalize empty results to `''`:
- Gemini: `response.text ?? ''` (`src/core/llm/gemini.ts`)
- OpenAI/Ollama: `response.choices[0]?.message.content ?? ''` (`src/core/llm/openai.ts`)
- Anthropic: joins an empty TextBlock array to `''`

Nothing checks whether the final TLDR string is non-empty before writing. (Note: the agent verified `response.text` does *not* throw in `@google/genai` — it returns `undefined`, so `?? ''` is correct. The issue is purely the lack of an empty-result guard, not a thrown getter.)

**Fix options:**
1. After `generateTldr` returns, check `if (!tldr.trim())` and error with a clear message ("Provider returned an empty response — check your model/key or try another provider") instead of writing an empty file.
2. Have each adapter throw on empty response rather than returning `''`.

---

## Verified non-issues (checked, no action needed)

- **`promptSecret` control-character bytes compiled wrong?** No. Hex-dumped source and `dist/cli.js` — `0x04` (Ctrl+D submit), `0x03` (Ctrl+C cancel), `0x7f` (DEL) all preserved identically through compilation.
- **`fetcher.ts` has no fetch timeout.** Pre-existing (unchanged by this commit). A stalled `raw.githubusercontent.com` hangs the CLI indefinitely. Not filed as it predates the reviewed change, but worth a future timeout/AbortController pass.

---

## Triage suggestion

Resolve before merge: **#1** (Ollama broken out of the box) and **#2** (README-documented flow broken). Strongly recommended: **#3**. The rest are safe to batch into a follow-up.