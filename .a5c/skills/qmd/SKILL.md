---
name: qmd
description: On-device hybrid search for markdown files. Use when looking up project documentation, searching notes, finding relevant code docs, recalling meeting notes, or querying any indexed knowledge base. Trigger phrases include "search docs", "find in notes", "look up", "what do the docs say about", "search for", or any documentation/knowledge retrieval request.
---

# QMD -- Query Markup Documents

On-device search engine combining BM25, vector search, and LLM re-ranking for markdown files.

## MCP Tools (preferred)

If qmd MCP server is configured, use the MCP tools directly:
- **query** -- hybrid search with automatic query expansion and re-ranking
- **get** -- retrieve a specific document by path or ID
- **multi_get** -- batch retrieve documents by glob pattern
- **status** -- check index health

## CLI Usage

### Search Modes

| Command | Description | Best for |
|---------|-------------|----------|
| `qmd search "query"` | BM25 keyword search | Exact terms, fast |
| `qmd vsearch "query"` | Vector semantic search | Meaning-based |
| `qmd query "query"` | Hybrid + re-ranking | Best quality |

### Common Options

```bash
-n <num>              # Number of results (default: 5)
-c <collection>       # Restrict to collection
--min-score <num>     # Minimum relevance score (0-1)
--full                # Show full document content
--json                # JSON output for parsing
```

### Index Maintenance

```bash
qmd update        # Re-index collections
qmd embed         # Regenerate embeddings
qmd status        # Index health
```
