# Ponytail Audit — tldreadme

> Full-repo scan for over-engineering. Ranked biggest cut first.

---

## Findings

| rank | tag | what to cut | replacement | path |
|------|-----|-------------|-------------|------|
| 1 | `native` | Three heavyweight SDK deps (`@anthropic-ai/sdk`, `openai`, `@google/genai`) | `fetch` + `JSON.stringify/parse` | `src/core/llm/*` |
| 2 | `yagni` | `src/core/llm/index.ts` — dispatcher with one caller (`cli.ts`); `mcp.ts` bypasses it entirely | inline the switch/map into `cli.ts` | `src/core/llm/index.ts` |
| 3 | `delete` | `promptSecret` — 28-line raw-mode stdin reader to hide API keys | use `promptLine` (echo is fine for local CLI) | `src/cli.ts` |
| 4 | `yagni` | `src/core/writer.ts` — single-export file, 11 lines, called twice | inline `writeFile(join(cwd, 'TLDReadme.md'), tldr, 'utf-8')` at call sites | `src/core/writer.ts` |
| 5 | `delete` | `capitalize()` — helper used once for a log message | `provider[0].toUpperCase() + provider.slice(1)` | `src/cli.ts` |
| 6 | `yagni` | `buildUserMessage()` — three-line string wrapper used twice | inline backtick template | `src/core/prompt.ts` |
| 7 | `shrink` | `getConfigPath()` — function returning a constant expression | `const CONFIG_PATH = join(...)` | `src/core/config.ts` |
| 8 | `shrink` | `README_FILENAMES` — 10 items with redundant case variants | trim duplicates: `['README.md','readme.md','README.rst','readme.rst','README.txt','readme.txt','README','readme']` | `src/core/fetcher.ts` |

---

## Net impact

| metric | current | possible |
|--------|---------|----------|
| source lines | ~578 | ~494 |
| source files | 10 | 8 |
| runtime deps | 4 (`@anthropic-ai/sdk`, `openai`, `@google/genai`, `commander`) | 1 (`commander`) |

**Estimated net: −84 lines, −3 deps, −2 files.**

---

## Notes

- `commander` kept — it’s doing real option/argument work, not a one-off `--help`.
- `@modelcontextprotocol/sdk` is out of scope for this audit (MCP server dep, not over-engineering).
- BUGS.md issues (#1–#7) are correctness/UX bugs, not complexity; handle in a normal review pass.
