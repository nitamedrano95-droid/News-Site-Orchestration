#!/usr/bin/env python3
"""
cleanup_cms_nuevos2_2026_06_02.py
==================================

Retroactive cleanup for cms-nuevos2 articles whose CONTENIDO column stores
the La Jornada or El Informador page chrome instead of the article prose.
Caused by a too-greedy article-selector regex in rss-ingest.js.

Two sites are affected:
  - alavistanoticias  (source: La Jornada,    23 rows)
  - breakingcentermexico (source: El Informador, ~40 rows)

The fix to rss-ingest.js (separate patch) selects the longest <article>
block on the page, which is the actual prose, and runs it through
cleanArticleContent. This script applies the SAME transformation to the
already-broken rows, by re-fetching the source URL and running the new
selector chain locally.

USAGE
-----
  1. Preview (no writes):
       python3 scripts/fixes/cleanup_cms_nuevos2_2026_06_02.py --dry-run
  2. Apply (writes the new CONTENIDO via wrangler):
       python3 scripts/fixes/cleanup_cms_nuevos2_2026_06_02.py --apply

SAFETY
------
- --dry-run is the default if no flag is passed.
- Each article is fetched from the SOURCE_URL, processed, and printed
  before any write. You can ctrl-c after previewing.
- The script does NOT delete rows; it only UPDATEs CONTENIDO in place.
- The original CONTENIDO is not preserved on disk. If you want a backup,
  run a `wrangler d1 execute ... --command "SELECT ..."` first.
"""

import argparse
import json
import re
import subprocess
import sys
import urllib.request
import ssl

CWD = "/home/sebastianvernis/News-Site-Orchestration/cms-nuevos2"
DB = "news_db_cms_nuevos2"

# Site -> (source URL fragment to identify, contamination patterns)
SITES = {
    "alavistanoticias": {
        "source_contains": "jornada.com.mx",
        "contam_patterns": [
            "article-cont", "go gui", "id=\"disqus", "MGID",
            "class=\"cabeza\"", "id=\"article-text\"", "class=\"credito-",
            "class=\"hemero\"", "Subir al inicio", '<div class="col col',
        ],
        "fix": "jornada",  # calls La Jornada path: re-parse <p> with >50 chars
    },
    "breakingcentermexico": {
        "source_contains": "informador.mx",
        "contam_patterns": [
            "<figure class=\"news-media", "news-data", "news-title",
        ],
        "fix": "informador",  # calls El Informador path: re-fetch and use longest <article>
    },
}


# ------------------------------------------------------------
# Article extraction (mirror of cms-nuevos2/src/cron/rss-ingest.js post-fix)
# ------------------------------------------------------------
def clean_article_content(text: str) -> str:
    if not text:
        return ""
    cleaned = text
    for rx in [
        r"<script[^>]*>[\s\S]*?</script>",
        r"<style[^>]*>[\s\S]*?</style>",
        r"<link[^>]*>",
        r"<meta[^>]*>",
        r"<noscript[^>]*>[\s\S]*?</noscript>",
        r"<iframe[^>]*>[\s\S]*?</iframe>",
        r"<object[^>]*>[\s\S]*?</object>",
        r"<embed[^>]*>",
        r"<form[^>]*>[\s\S]*?</form>",
        r"<input[^>]*>",
        r"<button[^>]*>[\s\S]*?</button>",
        r"<nav[^>]*>[\s\S]*?</nav>",
        r"<header[^>]*>[\s\S]*?</header>",
        r"<footer[^>]*>[\s\S]*?</footer>",
        r"<aside[^>]*>[\s\S]*?</aside>",
        r"<sidebar[^>]*>[\s\S]*?</sidebar>",
    ]:
        cleaned = re.sub(rx, "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.replace("\ufffd", "")
    cleaned = re.sub(r"[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]", "", cleaned)
    cleaned = cleaned.replace("\r\n", "\n")
    cleaned = re.sub(r"\n\s*\n\s*\n", "\n\n", cleaned)
    cleaned = re.sub(r"^\s+|\s+$", "", cleaned, flags=re.MULTILINE)

    lines = cleaned.split("\n")
    keep = []
    for line in lines:
        low = line.lower().strip()
        if len(line.strip()) < 10:
            continue
        if "suscribete" in low or "suscríbete" in low:
            continue
        if "publicidad" in low:
            continue
        if "lea también" in low or "lea tamb" in low:
            continue
        keep.append(line)
    joined = "\n".join(keep).strip()
    joined = re.sub(r"<[^>]+>", " ", joined)
    joined = re.sub(r"\s+", " ", joined).strip()
    return joined


def fetch_url(url: str, timeout: int = 15) -> str:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
    )
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def extract_informador(html: str) -> str:
    """Longest <article> + cleanArticleContent. Matches post-fix rss-ingest.js."""
    all_articles = re.findall(r"<article[^>]*>[\s\S]*?</article>", html, re.IGNORECASE)
    if not all_articles:
        return ""
    longest = max(all_articles, key=len)
    m = re.search(r"<article[^>]*>([\s\S]*?)</article>", longest, re.IGNORECASE)
    if not m:
        return ""
    return clean_article_content(m.group(1))


def extract_jornada(html: str) -> str:
    """La Jornada: fall back to <p> with >50 chars (no real <article> tag in
    the prose section). The new rss-ingest.js no longer matches the page
    wrapper, so the only path that fires for La Jornada is this <p> fallback."""
    pms = re.findall(r"<p[^>]*>([\s\S]*?)</p>", html, re.IGNORECASE)
    paragraphs = []
    for p in pms:
        text = re.sub(r"<[^>]+>", "", p).strip()
        if len(text) > 50:
            paragraphs.append(text)
    return clean_article_content("\n\n".join(paragraphs))


# ------------------------------------------------------------
# wrangler helpers
# ------------------------------------------------------------
def wrangler_query(sql: str) -> list:
    r = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB, "--remote", "--command", sql],
        cwd=CWD, capture_output=True, text=True, timeout=60,
    )
    out = r.stdout
    start = out.find('[\n  {\n    "results"')
    if start == -1:
        start = out.find('[{ "results"')
    if start == -1:
        start = out.rfind("[\n  {\n")
    if start == -1:
        raise RuntimeError(f"no JSON in wrangler output:\n{out[-1000:]}")
    end = out.rfind("]")
    return json.loads(out[start:end + 1])[0]["results"]


def wrangler_update(article_id: str, new_content: str):
    escaped = new_content.replace("'", "''")
    sql = f"UPDATE ARTICULOS_PARAFRASEADOS SET CONTENIDO = '{escaped}' WHERE ID = '{article_id}';\n"
    tmp = f"/tmp/_cleanup_{article_id}.sql"
    with open(tmp, "w") as f:
        f.write(sql)
    r = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB, "--remote", "--file", tmp],
        cwd=CWD, capture_output=True, text=True, timeout=60,
    )
    if r.returncode != 0:
        raise RuntimeError(f"UPDATE failed for {article_id}:\n{r.stderr[:500]}")
    return r.stdout


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------
def fetch_contaminated_for_site(site: str, contam_patterns: list) -> list:
    like = " OR ".join([f"CONTENIDO LIKE '%{p}%'" for p in contam_patterns])
    sql = f"""
        SELECT ID, TITULO_PARAFRASEADO, SOURCE_URL,
               LENGTH(CONTENIDO) as old_len,
               FECHA_PUBLICACION
        FROM ARTICULOS_PARAFRASEADOS
        WHERE SITIO_DESTINO = '{site}' AND ({like})
        ORDER BY FECHA_PUBLICACION DESC
    """
    return wrangler_query(sql)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", default=True)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--site", choices=list(SITES.keys()) + ["all"], default="all")
    args = ap.parse_args()

    do_apply = args.apply
    sites = list(SITES.keys()) if args.site == "all" else [args.site]

    grand_total = 0
    for site in sites:
        cfg = SITES[site]
        print("=" * 72)
        print(f"  {site}  (source: {cfg['source_contains']})")
        print("=" * 72)

        rows = fetch_contaminated_for_site(site, cfg["contam_patterns"])
        print(f"  Found {len(rows)} contaminated rows.\n")
        if not rows:
            continue

        fixed = 0
        for i, row in enumerate(rows, 1):
            url = row["SOURCE_URL"]
            old_len = row["old_len"]
            if not url:
                print(f"  [{i:2d}/{len(rows)}] {row['ID']}  SKIP (no SOURCE_URL)")
                continue
            try:
                html = fetch_url(url)
            except Exception as e:
                print(f"  [{i:2d}/{len(rows)}] {row['ID']}  FETCH ERROR: {e}")
                continue

            if cfg["fix"] == "jornada":
                new_content = extract_jornada(html)
            elif cfg["fix"] == "informador":
                new_content = extract_informador(html)
            else:
                raise ValueError(cfg["fix"])

            new_len = len(new_content)
            preview = new_content[:120].replace("\n", " ")
            print(f"  [{i:2d}/{len(rows)}] {row['ID']}")
            print(f"        title:   {row['TITULO_PARAFRASEADO'][:60]}")
            print(f"        old:     {old_len:5d} chars")
            print(f"        new:     {new_len:5d} chars  (delta {new_len - old_len:+d})")
            print(f"        preview: {preview}...")

            if do_apply and new_content:
                wrangler_update(row["ID"], new_content)
                print("        applied: yes")
            print()
            fixed += 1

        grand_total += fixed
        print(f"  Subtotal {site}: {fixed} articles processed\n")

    print("=" * 72)
    print(f"DONE. {grand_total} articles processed in total.")
    if not do_apply:
        print("Dry run only. Pass --apply to write the new CONTENIDO to DB.")


if __name__ == "__main__":
    main()
