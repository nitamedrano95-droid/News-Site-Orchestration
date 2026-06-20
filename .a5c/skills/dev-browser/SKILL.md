---
name: dev-browser
description: Browser automation with persistent page state. Use when users ask to navigate websites, fill forms, take screenshots, extract web data, test web apps, or automate browser workflows. Trigger phrases include "go to [url]", "click on", "fill out the form", "take a screenshot", "scrape", "automate", "test the website", "log into", or any browser interaction request.
---

# Dev Browser

A CLI for controlling browsers with sandboxed JavaScript scripts.
Scripts run in a QuickJS WASM sandbox with no host filesystem or network access.

## Quick Start

Run `dev-browser --help` to get the full API reference and usage guide.

## Usage

Pass JavaScript to dev-browser via stdin. Scripts have access to a `browser` global.

### Headless (default -- no visible window)

```bash
dev-browser --headless <<'EOF'
const page = await browser.getPage("main");
await page.goto("https://example.com");
console.log(await page.title());
EOF
```

## API Reference

### Browser Control

| Method | Description |
|--------|-------------|
| `browser.getPage(name)` | Get or create a named persistent page |
| `browser.newPage()` | Create a temporary page (cleaned after script) |
| `browser.listPages()` | List open tabs: `[{id, url, title, name}]` |
| `browser.closePage(name)` | Close a named page |

### Page Methods (Playwright API)

- `page.goto(url)` -- navigate
- `page.click(selector)` -- click element
- `page.fill(selector, value)` -- fill input
- `page.evaluate(fn)` -- run JS in page context
- `page.screenshot()` -- capture screenshot buffer
- `page.snapshotForAI({track?, depth?, timeout?})` -- AI-optimized DOM snapshot

### File I/O (restricted to `~/.dev-browser/tmp/`)

| Function | Description |
|----------|-------------|
| `saveScreenshot(buf, name)` | Save screenshot, returns file path |
| `writeFile(name, data)` | Write data, returns file path |
| `readFile(name)` | Read file contents |
