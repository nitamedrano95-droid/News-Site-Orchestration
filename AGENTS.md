<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **cloudflare-news-project** (13951 symbols, 29969 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/cloudflare-news-project/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/cloudflare-news-project/context` | Codebase overview, check index freshness |
| `gitnexus://repo/cloudflare-news-project/clusters` | All functional areas |
| `gitnexus://repo/cloudflare-news-project/processes` | All execution flows |
| `gitnexus://repo/cloudflare-news-project/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## CLI

- Re-index: `npx gitnexus analyze`
- Check freshness: `npx gitnexus status`
- Generate docs: `npx gitnexus wiki`

<!-- gitnexus:end -->

## LLM Provider Convention (jun 2026)

This repo's paraphrasing and supervision pipeline runs on **Ollama Cloud**
(https://ollama.com). OpenRouter/Gemini branches in `llm_client.py` are kept for
backward compatibility but are not used by active cron flows.

### Stack (defaults)

| Role | Provider | Model | Notes |
|---|---|---|---|
| Paraphrasing | `ollama` | `kimi-k2.6:cloud` | Editorial rewriting, ~23s/article, 256K ctx |
| Supervision | `ollama` | `glm-5.1:cloud` | JSON strict correction, ~1s, 20× cheaper than Kimi |
| Editorial selection / preflight | `ollama` | `glm-5.1:cloud` | Low-latency JSON |
| Category classification | `ollama` | `glm-5.1:cloud` | Used in `yesterday_today_ingest.py` |

### Environment variables

```
OLLAMA_API_KEY=<from https://ollama.com/settings/keys>
PARAPHRASE_PROVIDER=ollama
PARAPHRASE_MODEL=kimi-k2.6:cloud
SUPERVISOR_PROVIDER=ollama
SUPERVISOR_MODEL=glm-5.1:cloud
EDITOR_MODEL=glm-5.1:cloud
CATEGORY_MODEL=glm-5.1:cloud
```

All env vars are read with `os.environ.get(..., "<default>")` — to swap a
single role back to a different provider, override the `*_PROVIDER` and
`*_MODEL` vars without touching code.

### Canonical files (bit-identical across 5 CMS dirs)

The LLM plumbing is replicated bit-identical across
`cms-originaux/`, `cms-nuevos/`, `cms-nuevos2/`, `cms-nuevos3/`, `cms-selector/`.
When editing any of these, edit one and `cp` to the other four — never edit
in place, or the dirs will drift.

- `tools/news/llm_client.py` — `chat(provider, model, messages, ...)` router with branches `openrouter | gemini | ollama`
- `tools/news/paraphrase.py` — `NewsParaphraser` calls `chat(PARAPHRASE_PROVIDER, PARAPHRASE_MODEL, ...)`
- `tools/news/text_supervisor.py` — `supervise_article(article, provider, model)` returns JSON-cleaned article
- `tools/news/ai_multi_source_publish_flow.py` — multi-source publish flow; selection + synthesis
- `tools/news/bulk_politics_ingest.py` — bulk politics ingest
- `tools/news/yesterday_today_ingest.py` — yesterday+today ingest + AI categorization
- `tools/news/rss_ingest_direct.py` — direct RSS ingest with AI proofreading
- `scripts/utilities/paraphraser-openrouter.js` — JS variant; class renamed to `OllamaParaphraser` but filename kept for import compat

### Known quirk: `gpt-oss` + `think:false`

OpenAI's `gpt-oss:20b` and `gpt-oss:120b` on Ollama Cloud have a bug when
`think: false` is set together with a low `num_predict`: they burn the entire
output budget on internal "thinking" tokens and return `content: ""`. Symptom
is silent empty responses, not an error.

Workarounds:
- Use a flagship `:cloud` model (Kimi K2.6, GLM-5.1, DeepSeek V4 Pro, etc.) — they respect `think: false` correctly.
- If you must use `gpt-oss`, either omit `think: false` (accept higher latency) or set `num_predict` to at least 4× the expected content size.

### Verifying the integration

End-to-end live tests were run in jun 2026 with the user's Ollama Pro key:
- `kimi-k2.6:cloud` produced 546-word paraphrased article in 23.36s (Spanish, editorial style, facts preserved)
- `glm-5.1:cloud` returned valid supervisor JSON in 1.18s
- `deepseek-v4-pro:cloud` returned valid supervisor JSON in 2.79s

If you need to add a new provider, follow the same pattern: add a new `elif provider == "X":` branch in `llm_client.py` that reads its own env var, sends to its native API, and parses its native response. Do not call the provider directly from call sites — they only know about `chat(provider, model, messages)`.

## Repo Layout (jun 2026, post-reorganization)

One-off maintenance scripts used to be scattered in the repo root. They are
now grouped by intent under `scripts/`. **Before adding a new script to the
root, check if it fits one of the existing `scripts/*/` subdirs.**

```
scripts/
├── README.md          ← index of every script with one-line description
├── fixes/             one-off corrections (fix-*.py, fix-*.js)
├── data-migration/    bulk D1 / sites DB population
├── cms-internal/      platform maintenance (tokens, logos, layouts)
├── design/            design assets (palettebuilder.jsx)
├── deploy/            alternative deploy scripts
├── n8n/               n8n workflows as code (import into n8n, do not run)
└── legacy-css/        historical CSS, not in active builds
```

Documentation is similarly organized under `docs/`:

```
docs/
├── *.md                 operational docs (active)
├── guides/              long-form operational guides
├── analysis/            one-off analysis reports
├── history/             dated status reports, setup summaries, session logs
├── archive/             obsolete docs (do not edit, kept for history)
└── migrations/          historical SQL
```

Files that belong at repo root (don't move these without a strong reason):
- `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `AGENTS.md` — docs canónicos
- `package.json`, `bun.lock`, `package-lock.json` — config
- `wrangler.toml` — referencia (los reales viven en cada `cms-*/`)
- `.env.example`, `.gitignore` — config
- `deploy_all.sh` — entry point de deploy
