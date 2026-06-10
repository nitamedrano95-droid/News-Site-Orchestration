#!/usr/bin/env python3
"""
Generador de 25 sitios Next.js para cms-nuevos4.
Lee themes.json, ensambla variantes únicas por sitio, reemplaza placeholders,
instala deps y genera build estático.
"""

import json
import os
import shutil
import subprocess
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────
BASE_DIR = Path.home() / "projects/News-Site-Orchestration"
TEMPLATE_DIR = BASE_DIR / "_template-nextjs"
VARIANTS_DIR = TEMPLATE_DIR / "variants"
CMS_DIR = BASE_DIR / "cms-nuevos4"
SITES_DIR = CMS_DIR / "sites"

# Load theme catalog
with open(VARIANTS_DIR / "themes.json", "r", encoding="utf-8") as f:
    THEME_DATA = json.load(f)

THEMES = {t["slug"]: t for t in THEME_DATA["themes"]}
PALETTES = THEME_DATA["palettes"]
FONTS = THEME_DATA["fonts"]

def copy_variants(site_dir: Path, theme: dict):
    """Copia las variantes seleccionadas a components/"""
    # Header
    header_src = VARIANTS_DIR / f"headers/{theme['header']}.tsx"
    shutil.copy2(header_src, site_dir / "components/Header.tsx")
    
    # Footer
    footer_src = VARIANTS_DIR / f"footers/{theme['footer']}.tsx"
    shutil.copy2(footer_src, site_dir / "components/Footer.tsx")
    
    # Card
    card_src = VARIANTS_DIR / f"cards/{theme['card']}.tsx"
    shutil.copy2(card_src, site_dir / "components/ArticleCard.tsx")
    
    # Ticker
    ticker_src = VARIANTS_DIR / f"tickers/{theme['ticker']}.tsx"
    shutil.copy2(ticker_src, site_dir / "components/Ticker.tsx")
    
    # Layout (page.tsx)
    layout_src = VARIANTS_DIR / f"layouts/{theme['layout']}.tsx"
    shutil.copy2(layout_src, site_dir / "app/page.tsx")
    
    # LogoImage siempre igual
    logo_src = TEMPLATE_DIR / "components/LogoImage.tsx"
    shutil.copy2(logo_src, site_dir / "components/LogoImage.tsx")

def apply_theme(site_dir: Path, slug: str, title: str, theme: dict):
    """Reemplaza todos los placeholders en el sitio generado"""
    palette = PALETTES[theme["palette"]]
    font = FONTS[theme["font"]]
    
    replacements = {
        "PLACEHOLDER_NAME": slug,
        "PLACEHOLDER_TITLE": title,
        "PLACEHOLDER_COLOR": palette["primary"],
        "PLACEHOLDER_SECONDARY": palette["secondary"],
        "PLACEHOLDER_LIGHT": palette["light"],
        "PLACEHOLDER_BG": palette["bg"],
        "PLACEHOLDER_DARK": palette["dark"],
        "PLACEHOLDER_FONT_FAMILY": font["family"],
    }
    
    for root, dirs, files in os.walk(site_dir):
        # Skip node_modules
        if "node_modules" in root:
            continue
        for fname in files:
            if fname.endswith((".tsx", ".ts", ".css", ".js", ".json", ".html", ".toml")):
                fpath = Path(root) / fname
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    for old, new in replacements.items():
                        content = content.replace(old, new)
                    
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write(content)
                except (UnicodeDecodeError, PermissionError):
                    continue

def generate_site(slug: str, title: str):
    theme = THEMES.get(slug)
    if not theme:
        print(f"  ⚠️ No hay tema para {slug}, saltando")
        return False
    
    site_dir = SITES_DIR / slug
    
    print(f"Generando {slug} ({theme['layout']} + {theme['header']} + {theme['card']})...")
    
    # 1. Copiar plantilla base
    if site_dir.exists():
        shutil.rmtree(site_dir)
    shutil.copytree(
        TEMPLATE_DIR, site_dir,
        ignore=shutil.ignore_patterns(
            "node_modules", ".next", "out", "variants", 
            "package-lock.json", "*.log"
        )
    )
    
    # 2. Reemplazar componentes con variantes
    copy_variants(site_dir, theme)
    
    # 3. Reemplazar placeholders (colores, título, fuentes)
    apply_theme(site_dir, slug, title, theme)
    
    # 4. Instalar dependencias
    print(f"  📦 npm install...")
    result = subprocess.run(
        ["npm", "install"],
        cwd=site_dir,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"  ⚠️ npm install falló: {result.stderr[:200]}")
        return False
    
    # 5. Build estático
    print(f"  🔨 npm run build...")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=site_dir,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"  ⚠️ Build falló para {slug}:")
        print(result.stderr[-500:])
        return False
    
    print(f"  ✅ {slug} listo en {site_dir}/out/")
    return True

def main():
    if not TEMPLATE_DIR.exists():
        print(f"ERROR: No existe {TEMPLATE_DIR}")
        return 1
    
    SITES_DIR.mkdir(parents=True, exist_ok=True)
    
    # Lista de 25 sitios: [slug, title]
    SITES = [
        ["cronicanacionalmx", "Crónica Nacional MX"],
        ["reportedevanguardia", "Reporte de Vanguardia"],
        ["impactodiariomexico", "Impacto Diario México"],
        ["bitacorainformativa", "Bitácora Informativa"],
        ["visionnacionalnoticias", "Visión Nacional Noticias"],
        ["contextomexicano", "Contexto Mexicano"],
        ["focoinformativomx", "Foco Informativo MX"],
        ["prensaciudadana", "Prensa Ciudadana"],
        ["diarioglobalmexico", "Diario Global México"],
        ["sintesisinformativa", "Síntesis Informativa"],
        ["rutanacionalnoticias", "Ruta Nacional Noticias"],
        ["codigomexico", "Código México"],
        ["planacentral", "Plana Central"],
        ["horizonteinformativo", "Horizonte Informativo"],
        ["noticiasdeldiamx", "Noticias del Día MX"],
        ["radarnacional", "Radar Nacional"],
        ["expresodemexico", "Expreso de México"],
        ["puntocriticonoticias", "Punto Crítico Noticias"],
        ["espectromexicano", "Espectro Mexicano"],
        ["referenteinformativo", "Referente Informativo"],
        ["diariodelarepublica", "Diario de la República"],
        ["nexoinformativo", "Nexo Informativo"],
        ["sintagmanacional", "Sintagma Nacional"],
        ["enlacediariomexico", "Enlace Diario México"],
        ["frenteinformativo", "Frente Informativo"],
    ]
    
    success = 0
    for slug, title in SITES:
        if generate_site(slug, title):
            success += 1
    
    print(f"\n{'='*50}")
    print(f"✅ Generados: {success}/{len(SITES)} sitios")
    print(f"📁 Directorio: {SITES_DIR}")
    print(f"\nPara deploy en Cloudflare Pages:")
    print(f"  cd {SITES_DIR}/<slug> && npx wrangler pages deploy out/")
    
    return 0 if success == len(SITES) else 1

if __name__ == '__main__':
    exit(main())
