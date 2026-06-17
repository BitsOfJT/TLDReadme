# TLDReadme

GitHub READMEs are often overwhelming — long, jargon-heavy, and written for contributors rather than new users. TLDReadme gives you a plain-English 5-section summary of any README so you can quickly understand what you just installed.

Works as a **CLI tool** (standalone, outside any agent) and as an **MCP server** (inside Claude Code, claude.ai, or any agent harness that supports MCP).

---

## Install

```bash
npm install -g tldreadme
```

Requires **Node.js 18+**.

For the CLI, you'll also need an [Anthropic API key](https://console.anthropic.com).

---

## CLI Usage

**From a GitHub URL:**
```bash
tldreadme https://github.com/user/repo
```

**By pasting the README:**
```bash
tldreadme
# Paste your README text, then press Ctrl+D
```

The TLDR is printed to your terminal and saved to `TLDReadme.md` in your current directory.

**Set your API key first:**
```bash
export ANTHROPIC_API_KEY=your_key_here
```

---

## MCP Usage (inside an agent)

The MCP server uses your agent's own AI model — no separate API key needed.

### Claude Code

1. Open (or create) `~/.claude/settings.json`
2. Add the `tldreadme` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "tldreadme": {
      "command": "tldreadme-mcp"
    }
  }
}
```

3. Restart Claude Code
4. Verify it loaded by running `/mcp` — you should see `tldreadme` listed as connected

Then just ask Claude to summarize a README:
> "Use tldreadme to summarize https://github.com/user/repo"

Claude will call `tldreadme_fetch` to get the README, generate the TLDR using its own model, then call `tldreadme_save` to write `TLDReadme.md` and print the result.

### Other MCP-compatible agents

Add the same config block to your agent's MCP settings file:

```json
{
  "mcpServers": {
    "tldreadme": {
      "command": "tldreadme-mcp"
    }
  }
}
```

### Available tools

- **`tldreadme_fetch`** — pass a GitHub URL or raw README text; returns the content with summarization instructions for your agent to process
- **`tldreadme_save`** — pass the generated TLDR; saves it to `TLDReadme.md` in the current directory and prints it to the terminal

---

## Output Format

Every TLDR has exactly five sections:

```
## What it is
## What it does
## How to install
## Key commands
## Gotchas / caveats
```

Written for a mixed audience — a beginner should understand it, a professional should find it complete.

---

## Local Development

```bash
git clone https://github.com/BitsOfJT/TLDReadme
cd tldreadme
npm install
npm run build

# Test the CLI
export ANTHROPIC_API_KEY=your_key_here
node dist/cli.js https://github.com/user/repo
```
