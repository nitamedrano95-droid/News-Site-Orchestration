---
name: claude-mem
description: Persistent memory search across Claude Code sessions. Use when recalling what happened in previous sessions, searching project history, finding past decisions or context, or when the user asks "what did we do", "remember when", "last time", "previous session", or any historical project context query.
---

# Claude-Mem — Session Memory

Persistent memory that captures and retrieves context across Claude Code sessions.

## MCP Tools (3-Layer Workflow)

Claude-mem exposes three MCP tools — use progressive disclosure for token efficiency:

### Layer 1: `search` (~50-100 tokens)
Returns compact index with observation IDs matching your query. Start here.

### Layer 2: `timeline` (~100-300 tokens)
Shows chronological context around search results.

### Layer 3: `get_observations` (~500-1000 tokens)
Fetches full observation details by ID. Use only for specific IDs you need.

Always start with `search` → `timeline` → `get_observations` for specific IDs.

## Privacy

Wrap sensitive content in `<private>` tags to exclude from memory storage:
```
<private>API_KEY=sk-abc123</private>
```

## Web UI

View memory stream at http://localhost:37777
