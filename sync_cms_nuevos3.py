#!/usr/bin/env python3
"""
Script para sincronizar cms-nuevos3 con los estándares de cms-originaux.
Crea archivos faltantes y reemplaza los admin simples por admin funcionales.
"""

import os
import shutil
import re

BASE_DIR = "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project"
ORIGIN_ADMIN_DIR = f"{BASE_DIR}/cms-originaux/sites/bitacoraurbana/admin"
ORIGIN_SITE_DIR = f"{BASE_DIR}/cms-originaux/sites/bitacoraurbana"
TARGET_SITES_DIR = f"{BASE_DIR}/cms-nuevos3/sites"

SITES = [
    ("actualidadsinfronteras", "Actualidad Sin Fronteras", "fa-globe-americas"),
    ("adnmexicano", "ADN Mexicano", "fa-dna"),
    ("aztecamexiconoticias", "Azteca México Noticias", "fa-feather-alt"),
    ("diariomexicano", "Diario Mexicano", "fa-newspaper"),
    ("diariomexico", "Diario México", "fa-newspaper"),
    ("elanalisismexicano", "El Análisis Mexicano", "fa-search"),
    ("elobservadorrepublicano", "El Observador Republicano", "fa-eye"),
    ("elprofetamexicano", "El Profeta Mexicano", "fa-bullhorn"),
    ("enfoquemexicano", "Enfoque Mexicano", "fa-crosshairs"),
    ("expresomexicano", "Expreso Mexicano", "fa-bolt"),
    ("financemarketsmx", "Finance Markets MX", "fa-chart-line"),
    ("mexicannewsoftheworld", "Mexican News of the World", "fa-globe"),
    ("mexicoandtheworld", "Mexico and the World", "fa-globe"),
    ("mexicodaily", "México Daily", "fa-calendar-day"),
    ("mexicoenresumen", "México en Resumen", "fa-list-alt"),
    ("mexicoplus", "México Plus", "fa-plus-circle"),
    ("monitorrepublicano", "Monitor Republicano", "fa-desktop"),
    ("nacionalinstante", "Nacional al Instante", "fa-clock"),
    ("noticiasalinstante", "Noticias al Instante", "fa-bell"),
    ("perspectivamexicana", "Perspectiva Mexicana", "fa-glasses"),
    ("politicasalvajealminuto", "Política Salvaje al Minuto", "fa-fire"),
    ("pulsorepublicanonoticias", "Pulso Republicano Noticias", "fa-heartbeat"),
    ("radioredmx", "Radio Red MX", "fa-broadcast-tower"),
    ("republicamx", "República MX", "fa-flag"),
    ("wenewsmexico", "We News Mexico", "fa-newspaper"),
]

ARTICLE_CSS = """/* Article Page Styles */
.article-page { padding: 3rem 0; background: var(--background-color); }
.article-full { max-width: 900px; margin: 0 auto; background: var(--card-bg); border-radius: 12px; padding: 3rem; box-shadow: var(--shadow-md); }
.article-header { margin-bottom: 2rem; }
.article-category-badge { display: inline-block; padding: 4px 12px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; border-radius: 4px; color: white; margin-bottom: 1rem; }
.article-title { font-family: var(--font-primary); font-size: 2.5rem; font-weight: 800; line-height: 1.2; margin-bottom: 1rem; color: var(--text-color); }
.article-meta { display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; color: var(--text-muted); flex-wrap: wrap; }
.article-meta .author { font-weight: 600; color: var(--primary-color); }
.article-image-wrapper { margin: 2rem 0; }
.article-image { width: 100%; height: auto; border-radius: 8px; }
.image-caption { font-size: 0.85rem; color: var(--text-muted); text-align: center; margin-top: 0.5rem; font-style: italic; }
.article-content { font-size: 1.1rem; line-height: 1.8; color: var(--text-color); }
.article-content .lead { font-size: 1.25rem; font-weight: 500; color: var(--primary-color); margin-bottom: 1.5rem; }
.article-content p { margin-bottom: 1.5rem; }
.article-content h2 { font-family: var(--font-primary); font-size: 1.75rem; margin-top: 2.5rem; margin-bottom: 1rem; color: var(--primary-color); }
.article-content h3 { font-family: var(--font-primary); font-size: 1.4rem; margin-top: 2rem; margin-bottom: 0.75rem; color: var(--text-color); }
.article-content ul, .article-content ol { margin-left: 2rem; margin-bottom: 1.5rem; }
.article-content li { margin-bottom: 0.5rem; line-height: 1.7; }
.article-quote { border-left: 4px solid var(--accent-color); padding-left: 1.5rem; margin: 2rem 0; font-style: italic; font-size: 1.2rem; color: var(--text-muted); }
.article-quote cite { display: block; margin-top: 0.5rem; font-size: 0.9rem; font-weight: 600; color: var(--primary-color); }
.article-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); align-items: center; }
.tags-label, .share-label { font-weight: 600; color: var(--text-muted); margin-right: 0.5rem; }
.tag { padding: 4px 12px; background: var(--background-color); color: var(--primary-color); font-size: 0.85rem; border-radius: 20px; transition: all 0.3s ease; }
.tag:hover { background: var(--primary-color); color: white; }
.article-footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.article-share { display: flex; align-items: center; gap: 0.5rem; }
.share-link { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: white; font-size: 1rem; transition: all 0.3s ease; }
.share-link.facebook { background: #1877f2; }
.share-link.twitter { background: #1da1f2; }
.share-link.whatsapp { background: #25d366; }
.share-link.linkedin { background: #0077b5; }
.share-link:hover { transform: translateY(-3px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
.article-nav { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); }
.back-link { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--primary-color); font-weight: 600; transition: all 0.3s ease; }
.back-link:hover { color: var(--secondary-color); }
@media (max-width: 768px) { .article-full { padding: 1.5rem; } .article-title { font-size: 1.8rem; } .article-content { font-size: 1rem; } }
"""

LEGAL_CSS = """.legal-page { padding: 3rem 0; background: var(--background-color); min-height: 70vh; }
.legal-content { max-width: 900px; margin: 0 auto; background: var(--card-bg); padding: 3rem; border-radius: 12px; box-shadow: var(--shadow-md); }
.legal-content h1 { font-family: var(--font-primary); font-size: 2.5rem; margin-bottom: 1rem; color: var(--primary-color); }
.last-updated { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); }
.legal-section { margin-bottom: 2rem; }
.legal-section h2 { font-family: var(--font-primary); font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 1rem; color: var(--primary-color); }
.legal-section h3 { font-size: 1.1rem; margin-top: 1rem; margin-bottom: 0.5rem; color: var(--text-color); font-weight: 600; }
.legal-section p { line-height: 1.8; margin-bottom: 1rem; color: var(--text-color); }
.legal-section ul, .legal-section ol { margin-left: 2rem; margin-bottom: 1rem; }
.legal-section li { line-height: 1.8; margin-bottom: 0.5rem; color: var(--text-color); }
@media (max-width: 768px) { .legal-content { padding: 1.5rem; } .legal-content h1 { font-size: 1.8rem; } }
"""

SCRIPT_JS_TEMPLATE = """/* ========================================
   {site_name} - JavaScript
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {{
    // Hide preloader (if exists - now handled by components.js)
    const preloader = document.getElementById('preloader');
    if (preloader) {{
        setTimeout(() => {{
            preloader.classList.add('hidden');
            setTimeout(() => {{ preloader.style.display = 'none'; }}, 500);
        }}, 1000);
    }}

    // Article cards click handlers
    const articleCards = document.querySelectorAll('.news-card, .card-hero');
    articleCards.forEach(card => {{
        card.addEventListener('click', function() {{
            console.log('Article clicked');
        }});
    }});

    // Active navigation link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {{
        if (link.getAttribute('href') === currentPage) {{
            link.classList.add('active');
        }}
    }});

    // Sticky header shadow on scroll
    const header = document.querySelector('.header');
    if (header) {{
        window.addEventListener('scroll', () => {{
            if (window.pageYOffset > 100) {{
                header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
            }} else {{
                header.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
        }});
    }}

    console.log('{site_name} - Site loaded successfully');
}});
"""

REDIRECTS_TEMPLATE = """# Proxy /api/* al worker de noticias
/api/* https://cms-nuevos3.sebastianvernis.workers.dev/api/:splat 200

# RSS Feed
/rss.xml  /api/rss/{slug}  200
/feed.xml /api/rss/{slug}  200
"""


def adapt_admin_files(site_dir, slug, name, icon):
    admin_dir = os.path.join(site_dir, "admin")
    # Remove old admin and recreate
    if os.path.exists(admin_dir):
        shutil.rmtree(admin_dir)
    os.makedirs(admin_dir, exist_ok=True)

    # Copy base admin files from originaux
    for fname in os.listdir(ORIGIN_ADMIN_DIR):
        src = os.path.join(ORIGIN_ADMIN_DIR, fname)
        dst = os.path.join(admin_dir, fname)
        if os.path.isfile(src):
            shutil.copy2(src, dst)

    # Adapt index.html
    idx_path = os.path.join(admin_dir, "index.html")
    with open(idx_path, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace("Bitácora Urbana", name)
    content = content.replace("fa-city", icon)
    content = content.replace("bitacoraurbana", slug)
    with open(idx_path, "w", encoding="utf-8") as f:
        f.write(content)

    # Adapt login.html
    login_path = os.path.join(admin_dir, "login.html")
    with open(login_path, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace("Bitácora Urbana", name)
    content = content.replace("fa-city", icon)
    content = content.replace("bitacoraurbana", slug)
    with open(login_path, "w", encoding="utf-8") as f:
        f.write(content)

    # Adapt login.js
    loginjs_path = os.path.join(admin_dir, "login.js")
    with open(loginjs_path, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace("Bitácora Urbana", name)
    content = content.replace("bitacoraurbana", slug)
    with open(loginjs_path, "w", encoding="utf-8") as f:
        f.write(content)

    # Adapt script.js
    scriptjs_path = os.path.join(admin_dir, "script.js")
    with open(scriptjs_path, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace("Bitácora Urbana", name)
    content = content.replace("bitacoraurbana", slug)
    with open(scriptjs_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"  [admin] Adapted for {name}")


def create_missing_files(site_dir, slug, name, icon):
    # article.css
    article_css_path = os.path.join(site_dir, "article.css")
    if not os.path.exists(article_css_path):
        with open(article_css_path, "w", encoding="utf-8") as f:
            f.write(ARTICLE_CSS)
        print(f"  [article.css] Created")

    # legal.css
    legal_css_path = os.path.join(site_dir, "legal.css")
    if not os.path.exists(legal_css_path):
        with open(legal_css_path, "w", encoding="utf-8") as f:
            f.write(LEGAL_CSS)
        print(f"  [legal.css] Created")

    # script.js
    script_js_path = os.path.join(site_dir, "script.js")
    if not os.path.exists(script_js_path):
        with open(script_js_path, "w", encoding="utf-8") as f:
            f.write(SCRIPT_JS_TEMPLATE.format(site_name=name))
        print(f"  [script.js] Created")

    # _redirects
    redirects_path = os.path.join(site_dir, "_redirects")
    if not os.path.exists(redirects_path):
        with open(redirects_path, "w", encoding="utf-8") as f:
            f.write(REDIRECTS_TEMPLATE.format(slug=slug))
        print(f"  [_redirects] Created")


def process_site(slug, name, icon):
    site_dir = os.path.join(TARGET_SITES_DIR, slug)
    if not os.path.isdir(site_dir):
        print(f"[!] Directory not found: {site_dir}")
        return

    print(f"\nProcessing: {name} ({slug})")
    create_missing_files(site_dir, slug, name, icon)
    adapt_admin_files(site_dir, slug, name, icon)


def main():
    for slug, name, icon in SITES:
        process_site(slug, name, icon)
    print("\n✅ All sites synchronized!")


if __name__ == "__main__":
    main()
