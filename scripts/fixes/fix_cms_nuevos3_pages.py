#!/usr/bin/env python3
"""
Corrige referencias CSS/JS faltantes en las páginas de cms-nuevos3.
"""

import os
import re

BASE_DIR = "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-nuevos3/sites"

SITES = [
    "actualidadsinfronteras", "adnmexicano", "aztecamexiconoticias", "diariomexicano",
    "diariomexico", "elanalisismexicano", "elobservadorrepublicano", "elprofetamexicano",
    "enfoquemexicano", "expresomexicano", "financemarketsmx", "mexicannewsoftheworld",
    "mexicoandtheworld", "mexicodaily", "mexicoenresumen", "mexicoplus",
    "monitorrepublicano", "nacionalinstante", "noticiasalinstante", "perspectivamexicana",
    "politicasalvajealminuto", "pulsorepublicanonoticias", "radioredmx", "republicamx",
    "wenewsmexico",
]

LEGAL_PAGES = ["privacidad.html", "terminos.html", "acerca-de.html", "contacto.html"]


def fix_index_html(site_dir):
    path = os.path.join(site_dir, "index.html")
    if not os.path.exists(path):
        return False
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Add script.js between pwa-manager.js and components.js if missing
    if 'script.js' not in content:
        content = content.replace(
            '<script src="pwa-manager.js"></script>\n    <script src="components.js"></script>',
            '<script src="pwa-manager.js"></script>\n    <script src="script.js"></script>\n    <script src="components.js"></script>'
        )
        # Try alternative spacing
        content = content.replace(
            '<script src="pwa-manager.js"></script>\n<script src="components.js"></script>',
            '<script src="pwa-manager.js"></script>\n<script src="script.js"></script>\n<script src="components.js"></script>'
        )
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def fix_legal_page(site_dir, page):
    path = os.path.join(site_dir, page)
    if not os.path.exists(path):
        return False
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    changed = False

    # Add style.css before style-custom.css if missing
    if 'style.css' not in content:
        content = content.replace(
            '<link rel="stylesheet" href="style-custom.css">',
            '<link rel="stylesheet" href="style.css">\n  <link rel="stylesheet" href="style-custom.css">'
        )
        changed = True

    # Add legal.css after style-custom.css if missing
    if 'legal.css' not in content:
        content = content.replace(
            '<link rel="stylesheet" href="style-custom.css">',
            '<link rel="stylesheet" href="style-custom.css">\n  <link rel="stylesheet" href="legal.css">'
        )
        changed = True

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def process_site(slug):
    site_dir = os.path.join(BASE_DIR, slug)
    if not os.path.isdir(site_dir):
        print(f"[!] Not found: {site_dir}")
        return

    print(f"\nProcessing {slug}...")
    if fix_index_html(site_dir):
        print("  [index.html] Added script.js")

    for page in LEGAL_PAGES:
        if fix_legal_page(site_dir, page):
            print(f"  [{page}] Added style.css + legal.css")


def main():
    for slug in SITES:
        process_site(slug)
    print("\n✅ Page fixes complete!")


if __name__ == "__main__":
    main()
