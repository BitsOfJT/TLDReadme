# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build        # Compile TypeScript → dist/ (tsc)
npm run dev          # Run CLI in dev mode without building (tsx src/cli.ts)
```

No test suite is configured.

## Architecture

Two entry points share the same `src/core/` modules:

**`src/cli.ts`** — Commander-based CLI. Accepts a GitHub URL or raw README text (or stdin). Calls the Anthropic API directly with `SYSTEM_PROMPT` + README content and writes the result to `TLDReadme.md` in the current working directory. Requires `ANTHROPIC_API_KEY`.

**`src/mcp.ts`** — MCP server over stdio. Exposes two tools:
- `tldreadme_fetch`: fetches the README and returns the full prompt payload (system prompt + user message concatenated). The host LLM does the summarization — no Anthropic API call is made here.
- `tldreadme_save`: writes the caller-provided TLDR string to `TLDReadme.md`.

This split means the CLI handles summarization itself while the MCP server delegates it to whichever model is hosting the server.

**`src/core/fetcher.ts`** — Detects GitHub URLs vs raw text. For GitHub URLs, tries multiple README filename variants against `raw.githubusercontent.com/HEAD/`.

**`src/core/prompt.ts`** — Defines `SYSTEM_PROMPT` (the 5-section output format) and `buildUserMessage()`. The output format — `## What it is`, `## What it does`, `## How to install`, `## Key commands`, `## Gotchas / caveats` — is the single source of truth for both entry points.

**`src/core/writer.ts`** — Prints TLDR to stdout and writes `TLDReadme.md` to `process.cwd()`.

## Output

Both entry points write to `TLDReadme.md` in whatever directory the tool is run from (not the project root). The file is always overwritten, never appended.
