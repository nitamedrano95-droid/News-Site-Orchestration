#!/usr/bin/env python3
import os

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

for slug in SITES:
    idx_path = os.path.join(BASE_DIR, slug, "index.html")
    if not os.path.exists(idx_path):
        continue
    with open(idx_path, "r", encoding="utf-8") as f:
        content = f.read()
    if "script.js" in content:
        continue
    # Try to insert before components.js
    if '<script src="components.js"></script>' in content:
        content = content.replace(
            '<script src="components.js"></script>',
            '<script src="script.js"></script>\n    <script src="components.js"></script>'
        )
    elif "<script src=\"components.js\"\"" in content:
        content = content.replace(
            '<script src="components.js">',
            '<script src="script.js"></script>\n    <script src="components.js">'
        )
    else:
        # Fallback: insert before closing body tag
        content = content.replace(
            '</body>',
            '<script src="script.js"></script>\n</body>'
        )
    with open(idx_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Added script.js to {slug}/index.html")
