#!/usr/bin/env python3
"""
Validación final de cms-nuevos3 después de la sincronización.
"""

import os

BASE_DIR = "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-nuevos3"
SITES_DIR = os.path.join(BASE_DIR, "sites")

SITES = [
    "actualidadsinfronteras", "adnmexicano", "aztecamexiconoticias", "diariomexicano",
    "diariomexico", "elanalisismexicano", "elobservadorrepublicano", "elprofetamexicano",
    "enfoquemexicano", "expresomexicano", "financemarketsmx", "mexicannewsoftheworld",
    "mexicoandtheworld", "mexicodaily", "mexicoenresumen", "mexicoplus",
    "monitorrepublicano", "nacionalinstante", "noticiasalinstante", "perspectivamexicana",
    "politicasalvajealminuto", "pulsorepublicanonoticias", "radioredmx", "republicamx",
    "wenewsmexico",
]

REQUIRED_FILES = [
    "index.html", "style.css", "style-custom.css", "script.js",
    "article.css", "legal.css", "components.js", "_redirects", "_routes.json",
    "wrangler.toml", "robots.txt", "favicon.png",
]

REQUIRED_DIRS = [
    "articulo", "categoria", "admin", "functions",
]

ADMIN_FILES = [
    "index.html", "login.html", "login.js", "oauth-authorize-all.html",
    "script.js", "style.css",
]

def validate():
    errors = []
    warnings = []

    for slug in SITES:
        site_dir = os.path.join(SITES_DIR, slug)
        if not os.path.isdir(site_dir):
            errors.append(f"[{slug}] Directory missing")
            continue

        for f in REQUIRED_FILES:
            path = os.path.join(site_dir, f)
            if not os.path.exists(path):
                errors.append(f"[{slug}] Missing file: {f}")

        for d in REQUIRED_DIRS:
            path = os.path.join(site_dir, d)
            if not os.path.isdir(path):
                errors.append(f"[{slug}] Missing dir: {d}")

        admin_dir = os.path.join(site_dir, "admin")
        if os.path.isdir(admin_dir):
            for af in ADMIN_FILES:
                path = os.path.join(admin_dir, af)
                if not os.path.exists(path):
                    errors.append(f"[{slug}/admin] Missing file: {af}")
            # Check admin is functional (not demo)
            idx_path = os.path.join(admin_dir, "index.html")
            if os.path.exists(idx_path):
                with open(idx_path, "r", encoding="utf-8") as f:
                    content = f.read()
                if "Función no disponible en demo" in content:
                    errors.append(f"[{slug}/admin] Still has demo buttons!")
        else:
            errors.append(f"[{slug}] Missing admin directory")

        # Check index.html has script.js
        idx_path = os.path.join(site_dir, "index.html")
        if os.path.exists(idx_path):
            with open(idx_path, "r", encoding="utf-8") as f:
                content = f.read()
            if "script.js" not in content:
                warnings.append(f"[{slug}] index.html missing script.js reference")

        # Check legal pages have legal.css
        for page in ["privacidad.html", "terminos.html", "acerca-de.html", "contacto.html"]:
            page_path = os.path.join(site_dir, page)
            if os.path.exists(page_path):
                with open(page_path, "r", encoding="utf-8") as f:
                    content = f.read()
                if "legal.css" not in content:
                    warnings.append(f"[{slug}/{page}] missing legal.css")
                if "style.css" not in content:
                    warnings.append(f"[{slug}/{page}] missing style.css")

    # Backend checks
    fb_routes = os.path.join(BASE_DIR, "src/routes/facebook.js")
    with open(fb_routes, "r", encoding="utf-8") as f:
        fb_content = f.read()
    required_fb_endpoints = ["/monitor", "/queue", "/reset-timer", "/force-publish"]
    for ep in required_fb_endpoints:
        if ep not in fb_content:
            errors.append(f"[backend] facebook.js missing endpoint: {ep}")

    # Migration checks
    migration_003 = os.path.join(BASE_DIR, "migrations/003_add_25_sites.sql")
    if not os.path.exists(migration_003):
        errors.append("[backend] Missing migration 003_add_25_sites.sql")
    else:
        with open(migration_003, "r", encoding="utf-8") as f:
            m003 = f.read()
        for slug in SITES:
            if f"ARTICULOS_SITIO_{slug.upper()}" not in m003:
                errors.append(f"[backend] Migration 003 missing table for {slug}")

    print("=" * 60)
    print("CMS-NUEVOS3 VALIDATION REPORT")
    print("=" * 60)
    print(f"\nSites checked: {len(SITES)}")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")

    if errors:
        print("\n❌ ERRORS:")
        for e in errors:
            print(f"  - {e}")

    if warnings:
        print("\n⚠️ WARNINGS:")
        for w in warnings:
            print(f"  - {w}")

    if not errors and not warnings:
        print("\n✅ ALL CHECKS PASSED!")
    elif not errors:
        print("\n✅ No critical errors, but warnings exist.")
    else:
        print("\n❌ Validation failed with errors.")

    return len(errors) == 0


if __name__ == "__main__":
    validate()
