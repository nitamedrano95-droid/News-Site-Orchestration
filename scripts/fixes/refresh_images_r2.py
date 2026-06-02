#!/usr/bin/env python3
"""
refresh_images_r2.py
====================

Re-llena URL_IMAGEN de artículos sin imagen, descargando la imagen
desde la fuente original y subiéndola directamente a Cloudflare R2
vía la API S3-compatible.

Diferencia con refresh_images_cms.py: este script NO necesita el
endpoint admin del worker, ni deploys intermedios. Solo necesita:

  - Credenciales R2 (Access Key + Secret + Account ID)
  - Acceso wrangler a las 4 DBs (que ya tenés)

USO
---

  1. Crear archivo de credenciales (NO lo commitees):
       cat > ~/.r2_credentials <<'EOF'
       R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
       R2_ACCESS_KEY_ID=yyyyyyyyyyyyyyyyyyyyyyyy
       R2_SECRET_ACCESS_KEY=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
       EOF
       chmod 600 ~/.r2_credentials

  2. Listar lo que se va a procesar (no toca nada):
       python3 scripts/fixes/refresh_images_r2.py --list

  3. Preview (5 de muestra):
       python3 scripts/fixes/refresh_images_r2.py --dry-run --limit 5

  4. Aplicar (los 741):
       python3 scripts/fixes/refresh_images_r2.py --apply --concurrency 5

DEPENDENCIAS
------------

  pip install boto3 requests
"""

import argparse
import concurrent.futures
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error

# pip install boto3
import boto3
from botocore.config import Config

ROOT = "/home/sebastianvernis/News-Site-Orchestration"

CANDIDATOS = [
    ("cms-originaux", "news_db_cms_originaux"),
    ("cms-nuevos",   "news_db_cms_nuevos"),
    ("cms-nuevos2",  "news_db_cms_nuevos2"),
    ("cms-nuevos3",  "news_db_cms_nuevos3"),
]

CUTOFF = "2026-05-20"

# R2 endpoint format: https://<account_id>.r2.cloudflarestorage.com
R2_ENDPOINT_TEMPLATE = "https://{account_id}.r2.cloudflarestorage.com"
PUBLIC_URL_BASE = "https://uploads.sebastianvernis.space"

# Credenciales via env vars o archivo
CREDENTIALS_FILE = os.path.expanduser("~/.r2_credentials")
BUCKET_NAME = "cms-news"


# ------------------------------------------------------------
# Credenciales
# ------------------------------------------------------------
def load_credentials():
    creds = {}
    # 1) env vars
    for k in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
        if os.environ.get(k):
            creds[k] = os.environ[k]
    # 2) archivo
    if os.path.exists(CREDENTIALS_FILE):
        with open(CREDENTIALS_FILE) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    creds[k.strip()] = v.strip()
    required = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY")
    missing = [k for k in required if k not in creds]
    if missing:
        raise SystemExit(
            f"ERROR: missing credentials: {', '.join(missing)}\n"
            f"Set them via env vars or in {CREDENTIALS_FILE}"
        )
    return creds


def make_r2_client(creds):
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT_TEMPLATE.format(account_id=creds["R2_ACCOUNT_ID"]),
        aws_access_key_id=creds["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=creds["R2_SECRET_ACCESS_KEY"],
        config=Config(retries={"max_attempts": 2, "mode": "standard"}),
        region_name="auto",  # R2 usa "auto" como region
    )


# ------------------------------------------------------------
# HTML / image extraction
# ------------------------------------------------------------
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def fetch_html(source_url, timeout=15):
    req = urllib.request.Request(source_url, headers={"User-Agent": USER_AGENT})
    import ssl
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def absolutize(url, domain):
    if not url:
        return ""
    url = url.strip()
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("/"):
        return domain + url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return domain + "/" + url


def is_likely_logo(url):
    low = url.lower()
    return (("logo" in low) and ("article" not in low) and ("noticia" not in low)) \
        or ("favicon" in low) or ("/icon" in low) or ("avatar" in low) \
        or ("userpic" in low) or ("pixel" in low) or ("sprite" in low)


def extract_image_url(source_url):
    try:
        html = fetch_html(source_url)
    except Exception:
        return ""
    domain = re.match(r"https?://([^/]+)", source_url).group(0)

    # 1) OG:image
    m = re.search(r'<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE) \
        or re.search(r'<meta[^>]*content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']', html, re.IGNORECASE)
    if m:
        return absolutize(m.group(1), domain)

    # 2) Twitter card
    m = re.search(r'<meta[^>]*name=["\']twitter:image["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE) \
        or re.search(r'<meta[^>]*name=["\']twitter:image:src["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
    if m:
        return absolutize(m.group(1), domain)

    # 3) JSON-LD
    m = re.search(r'"image"\s*:\s*\[\s*\{\s*"url"\s*:\s*"([^"]+)"', html) \
        or re.search(r'"image"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"', html) \
        or re.search(r'"image"\s*:\s*"([^"]+)"', html)
    if m:
        return absolutize(m.group(1), domain)

    # 4) Primer <img> razonable
    for rx in [
        r'<img[^>]+class=["\'][^"\']*(?:figure|main|featured|hero|article|lead|portada)[^"\']*["\'][^>]+src=["\']([^"\']+)["\']',
        r'<(?:figure|div)[^>]+class=["\'][^"\']*(?:figure|image|media|img)[^"\']*["\'][^>]*>[^<]*<img[^>]+src=["\']([^"\']+)["\']',
        r'<img[^>]+src=["\']([^"\']+)["\'][^>]+(?:width|height)=["\'][^"\'\\]*[4-9]\d{2,}',
        r'<img[^>]+src=["\']([^"\']+)["\']',
    ]:
        m = re.search(rx, html, re.IGNORECASE)
        if m:
            url = absolutize(m.group(1) or m.group(2), domain)
            if url and not is_likely_logo(url):
                return url
    return ""


# ------------------------------------------------------------
# R2 upload
# ------------------------------------------------------------
def upload_to_r2(r2_client, image_url):
    """Descarga image_url, valida content-type, sube a R2. Devuelve la URL
    pública o '' si falló."""
    try:
        req = urllib.request.Request(image_url, headers={"User-Agent": USER_AGENT})
        import ssl
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=20) as r:
            content_type = r.headers.get("content-type") or "image/jpeg"
            if not content_type.startswith("image/"):
                return ""
            data = r.read()
            if len(data) < 1024:  # demasiado chico, probablemente 404 html
                return ""
            ext_map = {
                "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png",
                "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
            }
            ext = ext_map.get(content_type.split(";")[0].strip(), "jpg")
            key = f"auto/{uuid_str()}.{ext}"
            r2_client.put_object(
                Bucket=BUCKET_NAME, Key=key, Body=data,
                ContentType=content_type,
                Metadata={"source": image_url[:500]},
            )
            return f"{PUBLIC_URL_BASE}/{key}"
    except Exception:
        return ""


def uuid_str():
    import uuid
    return str(uuid.uuid4())


# ------------------------------------------------------------
# DB queries
# ------------------------------------------------------------
def query(db, q, cwd):
    r = subprocess.run(
        ["npx", "wrangler", "d1", "execute", db, "--remote", "--command", q],
        cwd=cwd, capture_output=True, text=True, timeout=120,
    )
    out = r.stdout
    start = out.find('[\n  {\n    "results"')
    if start == -1:
        start = out.find('[{ "results"')
    if start == -1:
        start = out.rfind("[\n  {\n")
    if start == -1:
        return None
    end = out.rfind("]")
    try:
        return json.loads(out[start:end + 1])[0]["results"]
    except Exception:
        return None


def update_url_imagen(cms, db, article_id, new_url):
    escaped = new_url.replace("'", "''")
    sql = f"UPDATE ARTICULOS_PARAFRASEADOS SET URL_IMAGEN = '{escaped}' WHERE ID = '{article_id}';\n"
    tmp = f"/tmp/_refresh_{article_id}.sql"
    with open(tmp, "w") as f:
        f.write(sql)
    r = subprocess.run(
        ["npx", "wrangler", "d1", "execute", db, "--remote", "--file", tmp],
        cwd=f"{ROOT}/{cms}", capture_output=True, text=True, timeout=60,
    )
    if r.returncode != 0:
        return False, r.stderr[:200]
    return True, None


def fetch_all_ids():
    by_cms = {}
    for cms, db in CANDIDATOS:
        rows = query(
            db,
            f"""
            SELECT ID, TITULO_PARAFRASEADO, SOURCE_URL, SITIO_DESTINO
            FROM ARTICULOS_PARAFRASEADOS
            WHERE DATE(FECHA_PUBLICACION) >= DATE('{CUTOFF}')
              AND (URL_IMAGEN IS NULL OR URL_IMAGEN = '')
            ORDER BY FECHA_PUBLICACION DESC
            """,
            f"{ROOT}/{cms}",
        )
        out = []
        if rows:
            for r in rows:
                sd = r.get("SITIO_DESTINO") or ""
                if "," in sd:
                    continue
                out.append(r)
        by_cms[cms] = out
    return by_cms


# ------------------------------------------------------------
# Worker
# ------------------------------------------------------------
def process_one(r2_client, article):
    article_id = article["ID"]
    source_url = article.get("SOURCE_URL")
    if not source_url:
        return {"id": article_id, "ok": False, "reason": "no-source-url"}

    img_url = extract_image_url(source_url)
    if not img_url:
        return {"id": article_id, "ok": False, "reason": "no-image-found"}

    r2_url = upload_to_r2(r2_client, img_url)
    if not r2_url:
        return {"id": article_id, "ok": False, "reason": "r2-upload-failed",
                "_img_url": img_url}
    return {"id": article_id, "ok": True, "imageUrl": r2_url, "_img_url": img_url}


def apply_to_db(cms, results_by_id):
    """Hace UPDATE de los IDs que tengan ok=True."""
    cms_db = next(db for c, db in CANDIDATOS if c == cms)
    applied = 0
    failed = 0
    for article_id, res in results_by_id.items():
        if not res.get("ok"):
            continue
        ok, err = update_url_imagen(cms, cms_db, article_id, res["imageUrl"])
        if ok:
            applied += 1
        else:
            failed += 1
            res["_db_error"] = err
    return applied, failed


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--dry-run", action="store_true", default=True)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--concurrency", type=int, default=5)
    ap.add_argument("--cms", choices=[c[0] for c in CANDIDATOS] + ["all"], default="all")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--output", help="Path para JSON con resultados")
    args = ap.parse_args()

    do_apply = args.apply

    if args.list:
        by_cms = fetch_all_ids()
        total = sum(len(v) for v in by_cms.values())
        print(f"Total: {total} articulos sin imagen en los ultimos 14 dias\n")
        for cms, rows in by_cms.items():
            print(f"  {cms:14s} {len(rows):5d} articulos")
        return

    # Si no es --apply, es dry-run: procesa imagenes pero NO toca DB
    do_apply = args.apply

    # Cargar credenciales R2
    print("Cargando credenciales R2...")
    creds = load_credentials()
    r2_client = make_r2_client(creds)
    print(f"  R2 endpoint: {R2_ENDPOINT_TEMPLATE.format(account_id=creds['R2_ACCOUNT_ID'])}")
    print(f"  Bucket:      {BUCKET_NAME}")
    print(f"  Public URL:  {PUBLIC_URL_BASE}/<key>")

    by_cms = fetch_all_ids()
    sites = [args.cms] if args.cms != "all" else [c[0] for c in CANDIDATOS]

    grand = {"processed": 0, "applied": 0, "skipped": 0, "failed": 0, "db_errors": 0}
    all_results = {}

    for cms in sites:
        rows = by_cms.get(cms, [])
        if args.limit:
            rows = rows[:args.limit]
        if not rows:
            continue
        print(f"\n[{cms}] Processing {len(rows)} articles (concurrency={args.concurrency})...")
        if not do_apply:
            print(f"  *** DRY RUN: will process images + upload to R2 but NOT write to DB ***")

        # Procesa imagenes en paralelo
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as ex:
            futs = {ex.submit(process_one, r2_client, r): r for r in rows}
            done = 0
            for fut in concurrent.futures.as_completed(futs):
                res = fut.result()
                results.append(res)
                done += 1
                if done % 25 == 0 or done == len(rows):
                    ok = sum(1 for x in results if x.get("ok"))
                    skip = sum(1 for x in results if not x.get("ok") and not x.get("_db_error"))
                    fail = sum(1 for x in results if not x.get("ok"))
                    print(f"  [{cms}] {done}/{len(rows)} processed (ok={ok} fail={fail})")

        # Aplicar UPDATEs a la DB (solo si --apply)
        results_by_id = {r["id"]: r for r in results}
        if do_apply:
            applied, db_failed = apply_to_db(cms, results_by_id)
        else:
            applied, db_failed = 0, 0
        skipped = sum(1 for r in results if not r.get("ok"))

        print(f"  [{cms}] DB updates: applied={applied} failed={db_failed} skipped={skipped}")
        grand["processed"] += len(results)
        grand["applied"] += applied
        grand["db_errors"] += db_failed
        grand["skipped"] += skipped
        all_results[cms] = results

        # En dry-run, mostrar detalle de cada artículo
        if not do_apply:
            print(f"\n  Detail:")
            for r in sorted(results, key=lambda x: x.get("id", "")):
                titulo = ""
                for src in by_cms.get(cms, []):
                    if src.get("ID") == r["id"]:
                        titulo = (src.get("TITULO_PARAFRASEADO") or "")[:50]
                        break
                if r.get("ok"):
                    print(f"    OK    {r['id'][:8]}  {titulo:<50s}  -> {r['imageUrl'][:60]}")
                else:
                    print(f"    FAIL  {r['id'][:8]}  {titulo:<50s}  reason={r.get('reason')}")

    print("\n" + "=" * 60)
    print(f"GRAND TOTAL: processed={grand['processed']} applied={grand['applied']} "
          f"skipped={grand['skipped']} db_errors={grand['db_errors']}")

    if args.output:
        with open(args.output, "w") as f:
            json.dump({"grand": grand, "by_cms": all_results}, f, indent=2, default=str)
        print(f"Detailed results saved to {args.output}")


if __name__ == "__main__":
    main()
