## [2026-05-11] SCRAPING Implementation Decisions

### Architecture
- SCRAPING sources are processed entirely in the n8n `Process & Clean` Code node
- No new n8n nodes were added; the SCRAPING branch lives alongside RSS in the same Code node
- Workers continue to handle: AI paraphrasing, image handling (R2/KV), D1 storage, distribution

### SCRAPING Approach
- 4 link extraction strategies (from Workers' `scrapeSectionForLinks`):
  1. Standard `href` attributes with domain/path filtering
  2. `data-*` attributes (data-href, data-url, data-link)
  3. Embedded JSON (Next.js, Nuxt)
  4. Article card heuristics (`<a>` followed by heading tags)
- Content extraction: 7 HTML selectors + paragraph-level filtering
- Title extraction: og:title → twitter:title → <title> → <h1>
- Image extraction: og:image → twitter:image → first img in article

### n8n SDK Notes
- Code node code is stored under `jsCode` (NOT `code`)
- Template literals in SDK code must use `\\` for backslashes in regex
- `String.raw` tagged templates are NOT supported by the SDK parser
- `splitInBatches` uses `onEachBatch()` + `nextBatch(sibNode)` for loops
