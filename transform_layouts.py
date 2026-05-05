#!/usr/bin/env python3
"""
Transform all cms-nuevos3 sites with unique layouts.
Preserves existing color palettes and fonts.
"""

import os
import re
import glob

BASE_DIR = "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-nuevos3/sites"

# Layout assignments per site
LAYOUT_MAP = {
    "actualidadsinfronteras": "magazine",
    "enfoquemexicano": "magazine",
    "adnmexicano": "split",
    "elanalisismexicano": "split", 
    "monitorrepublicano": "split",
    "aztecamexiconoticias": "bento",
    "expresomexicano": "bento",
    "mexicoplus": "bento",
    "diariomexicano": "masonry",
    "diariomexico": "masonry",
    "mexicoenresumen": "masonry",
    "financemarketsmx": "list",
    "mexicodaily": "list",
    "nacionalinstante": "list",
    "elprofetamexicano": "cinematic",
    "politicasalvajealminuto": "cinematic",
    "radioredmx": "cinematic",
    "mexicannewsoftheworld": "newspaper",
    "mexicoandtheworld": "newspaper",
    "pulsorepublicanonoticias": "newspaper",
    "noticiasalinstante": "bold",
    "perspectivamexicana": "bold",
    "republicamx": "bold",
    "wenewsmexico": "bold",
    "elobservadorrepublicano": "bold",
}

def extract_site_info(index_html_path):
    """Extract site-specific info from index.html."""
    info = {}
    with open(index_html_path, 'r') as f:
        content = f.read()
    api_match = re.search(r'data-api="([^"]+)"', content)
    if api_match:
        info['api_url'] = api_match.group(1)
    title_match = re.search(r'<title>([^<]+)</title>', content)
    if title_match:
        info['title'] = title_match.group(1)
    ph_match = re.search(r'placehold\.co/[^/]+/([0-9a-fA-F#]+)', content)
    if ph_match:
        info['placeholder_color'] = ph_match.group(1).lstrip('#')
    else:
        info['placeholder_color'] = '0e7490'
    return info

def get_layout_html(layout, info):
    """Get layout-specific HTML/JS."""
    api = info.get('api_url', '/api/articles?limit=12')
    color = info.get('placeholder_color', '0e7490')
    title = info.get('title', 'Noticias')

    layouts = {
        "magazine": f'''<script>
    (async function(){{
        const apiUrl = '{api}';
        let articles = [];
        try {{
            const res = await fetch(apiUrl);
            if(!res.ok) throw new Error('Network');
            const data = await res.json();
            articles = data.articles || [];
        }} catch(e) {{
            if (window.PWAManager) articles = await PWAManager.getLocalArticles();
        }}
        if(!articles?.length) return;
        const hero = articles[0];
        const secondary = articles.slice(1, 4);
        const grid = articles.slice(4);
        const heroContainer = document.getElementById('latest-container');
        if(heroContainer) {{
            heroContainer.innerHTML = '<div class="magazine-layout"><div class="magazine-hero">' +
                '<a href="/articulo/?slug=' + encodeURIComponent(hero.slug) + '" class="hero-main">' +
                '<img src="' + (hero.imageUrl || 'https://placehold.co/1200x600/{color}/ffffff?text=News') + '" alt="' + hero.title + '">' +
                '<div class="hero-overlay"><span class="hero-cat">' + (hero.category || 'Noticias') + '</span>' +
                '<h1>' + hero.title + '</h1><p>' + (hero.desc ? hero.desc.substring(0, 200) + '...' : '') + '</p>' +
                '<span class="hero-date">' + (hero.publishedAt ? new Date(hero.publishedAt).toLocaleDateString('es-MX') : '') + '</span></div></a>' +
                '<div class="magazine-sidebar">' + secondary.map(a =>
                    '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="side-item">' +
                    '<img src="' + (a.imageUrl || 'https://placehold.co/300x200/{color}/ffffff?text=News') + '" alt="' + a.title + '">' +
                    '<div class="side-content"><span class="side-cat">' + (a.category || 'Noticias') + '</span><h4>' + a.title + '</h4></div></a>'
                ).join('') + '</div></div></div>';
        }}
        const newsContainer = document.getElementById('news-container');
        if(newsContainer) {{
            newsContainer.innerHTML = grid.map(a =>
                '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="news-card">' +
                '<div class="card-img-wrap"><img src="' + (a.imageUrl || 'https://placehold.co/600x400/{color}/ffffff?text=News') + '" alt="' + a.title + '"></div>' +
                '<div class="news-content"><span class="news-category">' + (a.category || 'Noticias') + '</span>' +
                '<h3 class="news-title">' + a.title + '</h3><p class="news-desc">' + (a.desc ? a.desc.substring(0, 120) + '...' : '') + '</p>' +
                '<span class="news-date">' + (a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('es-MX') : '') + '</span></div></a>'
            ).join('');
        }}
    }})();
    </script>''',

        "split": f'''<script>
    (async function(){{
        const apiUrl = '{api}';
        let articles = [];
        try {{
            const res = await fetch(apiUrl);
            if(!res.ok) throw new Error('Network');
            const data = await res.json();
            articles = data.articles || [];
        }} catch(e) {{
            if (window.PWAManager) articles = await PWAManager.getLocalArticles();
        }}
        if(!articles?.length) return;
        const hero = articles[0];
        const cards = articles.slice(1);
        const container = document.querySelector('.main-content');
        if(container) {{
            container.innerHTML = '<div class="split-editorial"><aside class="split-left"><div class="sticky-hero">' +
                '<a href="/articulo/?slug=' + encodeURIComponent(hero.slug) + '">' +
                '<div class="hero-img" style="background-image:url(\'' + (hero.imageUrl || 'https://placehold.co/800x1000/{color}/ffffff?text=News') + '\')"></div>' +
                '<div class="hero-text"><span class="hero-cat">' + (hero.category || 'Noticias') + '</span>' +
                '<h1>' + hero.title + '</h1><p>' + (hero.desc ? hero.desc.substring(0, 300) + '...' : '') + '</p></div></a></div></aside>' +
                '<div class="split-right"><h2 class="section-label">M&aacute;s Noticias</h2><div class="editorial-list">' +
                cards.map(a =>
                    '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="editorial-card">' +
                    '<div class="editorial-img" style="background-image:url(\'' + (a.imageUrl || 'https://placehold.co/400x300/{color}/ffffff?text=News') + '\')"></div>' +
                    '<div class="editorial-body"><span class="editorial-cat">' + (a.category || 'Noticias') + '</span>' +
                    '<h3>' + a.title + '</h3><p>' + (a.desc ? a.desc.substring(0, 150) + '...' : '') + '</p>' +
                    '<span class="read-more">Leer m&aacute;s &rarr;</span></div></a>'
                ).join('') + '</div></div></div>';
        }}
    }})();
    </script>''',

        "bento": f'''<script>
    (async function(){{
        const apiUrl = '{api}';
        let articles = [];
        try {{
            const res = await fetch(apiUrl);
            if(!res.ok) throw new Error('Network');
            const data = await res.json();
            articles = data.articles || [];
        }} catch(e) {{
            if (window.PWAManager) articles = await PWAManager.getLocalArticles();
        }}
        if(!articles?.length) return;
        const main = articles[0];
        const sub = articles.slice(1, 5);
        const rest = articles.slice(5);
        const container = document.querySelector('.main-content');
        if(container) {{
            container.innerHTML = '<div class="bento-grid">' +
                '<a href="/articulo/?slug=' + encodeURIComponent(main.slug) + '" class="bento-main">' +
                '<img src="' + (main.imageUrl || 'https://placehold.co/800x600/{color}/ffffff?text=News') + '" alt="' + main.title + '">' +
                '<div class="bento-overlay"><span class="bento-cat">' + (main.category || 'Noticias') + '</span><h1>' + main.title + '</h1></div></a>' +
                sub.map((a, i) =>
                    '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="bento-sub bento-sub-' + (i+1) + '">' +
                    '<img src="' + (a.imageUrl || 'https://placehold.co/400x300/{color}/ffffff?text=News') + '" alt="' + a.title + '">' +
                    '<div class="bento-overlay"><span class="bento-cat">' + (a.category || 'Noticias') + '</span><h3>' + a.title + '</h3></div></a>'
                ).join('') + '</div>' +
                '<h2 class="section-label">Descubre m&aacute;s</h2><div class="bento-rest">' +
                rest.map(a =>
                    '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="bento-mini">' +
                    '<img src="' + (a.imageUrl || 'https://placehold.co/300x200/{color}/ffffff?text=News') + '" alt="' + a.title + '">' +
                    '<div class="mini-body"><span class="mini-cat">' + (a.category || 'Noticias') + '</span><h4>' + a.title + '</h4></div></a>'
                ).join('') + '</div>';
        }}
    }})();
    </script>''',

        "masonry": f'''<script>
    (async function(){{
        const apiUrl = '{api}';
        let articles = [];
        try {{
            const res = await fetch(apiUrl);
            if(!res.ok) throw new Error('Network');
            const data = await res.json();
            articles = data.articles || [];
        }} catch(e) {{
            if (window.PWAManager) articles = await PWAManager.getLocalArticles();
        }}
        if(!articles?.length) return;
        const container = document.querySelector('.main-content');
        if(container) {{
            container.innerHTML = '<div class="masonry-wall">' + articles.map((a, i) => {{
                const shape = i % 3 === 0 ? 'tall' : i % 3 === 1 ? 'wide' : 'normal';
                const dims = i % 3 === 0 ? '400x600' : i % 3 === 1 ? '600x300' : '400x400';
                const descLen = i % 3 === 0 ? 200 : 80;
                return '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="masonry-brick brick-' + shape + '">' +
                    '<div class="brick-img"><img src="' + (a.imageUrl || 'https://placehold.co/' + dims + '/{color}/ffffff?text=News') + '" alt="' + a.title + '"></div>' +
                    '<div class="brick-body"><span class="brick-cat">' + (a.category || 'Noticias') + '</span>' +
                    '<h3>' + a.title + '</h3><p>' + (a.desc ? a.desc.substring(0, descLen) + '...' : '') + '</p></div></a>';
            }}).join('') + '</div>';
        }}
    }})();
    </script>''',

        "list": f'''<script>
    (async function(){{
        const apiUrl = '{api}';
        let articles = [];
        try {{
            const res = await fetch(apiUrl);
            if(!res.ok) throw new Error('Network');
            const data = await res.json();
            articles = data.articles || [];
        }} catch(e) {{
            if (window.PWAManager) articles = await PWAManager.getLocalArticles();
        }}
        if(!articles?.length) return;
        const featured = articles[0];
        const list = articles.slice(1);
        const container = document.querySelector('.main-content');
        if(container) {{
            container.innerHTML = '<div class="list-layout">' +
                '<a href="/articulo/?slug=' + encodeURIComponent(featured.slug) + '" class="list-featured">' +
                '<img src="' + (featured.imageUrl || 'https://placehold.co/1200x500/{color}/ffffff?text=News') + '" alt="' + featured.title + '">' +
                '<div class="featured-body"><span class="featured-cat">' + (featured.category || 'Noticias') + '</span>' +
                '<h1>' + featured.title + '</h1><p>' + (featured.desc ? featured.desc.substring(0, 300) + '...' : '') + '</p></div></a>' +
                '<div class="article-list">' + list.map((a, i) =>
                    '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="list-item">' +
                    '<span class="list-num">' + String(i+1).padStart(2, '0') + '</span>' +
                    '<div class="list-img"><img src="' + (a.imageUrl || 'https://placehold.co/200x150/{color}/ffffff?text=News') + '" alt="' + a.title + '"></div>' +
                    '<div class="list-body"><span class="list-cat">' + (a.category || 'Noticias') + '</span>' +
                    '<h3>' + a.title + '</h3><p>' + (a.desc ? a.desc.substring(0, 140) + '...' : '') + '</p></div></a>'
                ).join('') + '</div></div>';
        }}
    }})();
    </script>''',

        "cinematic": f'''<script>
    (async function(){{
        const apiUrl = '{api}';
        let articles = [];
        try {{
            const res = await fetch(apiUrl);
            if(!res.ok) throw new Error('Network');
            const data = await res.json();
            articles = data.articles || [];
        }} catch(e) {{
            if (window.PWAManager) articles = await PWAManager.getLocalArticles();
        }}
        if(!articles?.length) return;
        const hero = articles[0];
        const cards = articles.slice(1);
        const container = document.querySelector('.main-content');
        if(container) {{
            container.innerHTML = '<div class="cinematic-hero" style="background-image:url(\'' + (hero.imageUrl || 'https://placehold.co/1600x900/{color}/ffffff?text=News') + '\')">' +
                '<div class="cinematic-overlay"></div><div class="cinematic-content">' +
                '<span class="cinematic-cat">' + (hero.category || 'Noticias') + '</span>' +
                '<h1>' + hero.title + '</h1><p>' + (hero.desc ? hero.desc.substring(0, 300) + '...' : '') + '</p>' +
                '<a href="/articulo/?slug=' + encodeURIComponent(hero.slug) + '" class="cinematic-btn">Leer Art&iacute;culo</a></div></div>' +
                '<div class="cinematic-grid">' + cards.map(a =>
                    '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="cine-card">' +
                    '<div class="cine-img"><img src="' + (a.imageUrl || 'https://placehold.co/600x400/{color}/ffffff?text=News') + '" alt="' + a.title + '">' +
                    '<div class="cine-img-overlay"></div></div>' +
                    '<div class="cine-body"><span class="cine-cat">' + (a.category || 'Noticias') + '</span>' +
                    '<h3>' + a.title + '</h3><p>' + (a.desc ? a.desc.substring(0, 120) + '...' : '') + '</p></div></a>'
                ).join('') + '</div>';
        }}
    }})();
    </script>''',

        "newspaper": f'''<script>
    (async function(){{
        const apiUrl = '{api}';
        let articles = [];
        try {{
            const res = await fetch(apiUrl);
            if(!res.ok) throw new Error('Network');
            const data = await res.json();
            articles = data.articles || [];
        }} catch(e) {{
            if (window.PWAManager) articles = await PWAManager.getLocalArticles();
        }}
        if(!articles?.length) return;
        const headline = articles[0];
        const subheads = articles.slice(1, 4);
        const columns = articles.slice(4);
        const container = document.querySelector('.main-content');
        if(container) {{
            container.innerHTML = '<div class="newspaper-masthead"><h1 class="paper-title">{title}</h1>' +
                '<div class="paper-date">' + new Date().toLocaleDateString('es-MX', {{weekday:'long', year:'numeric', month:'long', day:'numeric'}}) + '</div></div>' +
                '<div class="newspaper-headline"><a href="/articulo/?slug=' + encodeURIComponent(headline.slug) + '">' +
                '<h1>' + headline.title + '</h1>' +
                '<img src="' + (headline.imageUrl || 'https://placehold.co/1200x500/{color}/ffffff?text=News') + '" alt="' + headline.title + '">' +
                '<p>' + (headline.desc ? headline.desc.substring(0, 400) + '...' : '') + '</p></a></div>' +
                '<div class="newspaper-subheads">' + subheads.map(a =>
                    '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="subhead-item">' +
                    '<h3>' + a.title + '</h3><p>' + (a.desc ? a.desc.substring(0, 200) + '...' : '') + '</p></a>'
                ).join('') + '</div>' +
                '<div class="newspaper-columns">' + columns.map(a =>
                    '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="column-item">' +
                    '<h4>' + a.title + '</h4><p>' + (a.desc ? a.desc.substring(0, 160) + '...' : '') + '</p></a>'
                ).join('') + '</div>';
        }}
    }})();
    </script>''',

        "bold": f'''<script>
    (async function(){{
        const apiUrl = '{api}';
        let articles = [];
        try {{
            const res = await fetch(apiUrl);
            if(!res.ok) throw new Error('Network');
            const data = await res.json();
            articles = data.articles || [];
        }} catch(e) {{
            if (window.PWAManager) articles = await PWAManager.getLocalArticles();
        }}
        if(!articles?.length) return;
        const hero = articles.slice(0, 2);
        const grid = articles.slice(2);
        const container = document.querySelector('.main-content');
        if(container) {{
            container.innerHTML = '<div class="bold-hero-row">' + hero.map((a, i) =>
                '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="bold-hero ' + (i === 0 ? 'hero-primary' : 'hero-secondary') + '">' +
                '<img src="' + (a.imageUrl || 'https://placehold.co/' + (i===0 ? '800x600' : '600x400') + '/{color}/ffffff?text=News') + '" alt="' + a.title + '">' +
                '<div class="bold-overlay"><span class="bold-cat">' + (a.category || 'Noticias') + '</span>' +
                '<h2>' + a.title + '</h2><p>' + (a.desc ? a.desc.substring(0, i===0 ? 200 : 100) + '...' : '') + '</p></div></a>'
            ).join('') + '</div>' +
            '<h2 class="bold-section-title">Noticias Destacadas</h2><div class="bold-grid">' + grid.map(a =>
                '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="bold-card">' +
                '<div class="bold-img-wrap"><img src="' + (a.imageUrl || 'https://placehold.co/600x400/{color}/ffffff?text=News') + '" alt="' + a.title + '"></div>' +
                '<div class="bold-card-body"><span class="bold-cat">' + (a.category || 'Noticias') + '</span>' +
                '<h3>' + a.title + '</h3><p>' + (a.desc ? a.desc.substring(0, 140) + '...' : '') + '</p></div></a>'
            ).join('') + '</div>';
        }}
    }})();
    </script>''',
    }
    return layouts.get(layout, layouts["magazine"])

CSS_TEMPLATES = {
    "magazine": """
/* ===== MAGAZINE LAYOUT ===== */
.magazine-layout { max-width: 1400px; margin: 0 auto; padding: 0 24px; }
.magazine-hero { display: grid; grid-template-columns: 2fr 1fr; gap: 2px; background: var(--border-color); border-radius: 16px; overflow: hidden; margin-bottom: 48px; box-shadow: 0 20px 60px rgba(0,0,0,0.12); }
.hero-main { position: relative; overflow: hidden; display: block; min-height: 500px; }
.hero-main img { width: 100%; height: 100%; object-fit: cover; position: absolute; transition: transform 0.6s ease; }
.hero-main:hover img { transform: scale(1.05); }
.hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 48px; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%); color: white; }
.hero-overlay h1 { font-size: clamp(1.8rem, 3vw, 2.8rem); font-weight: 800; line-height: 1.15; margin: 12px 0; }
.hero-overlay p { font-size: 1.05rem; opacity: 0.85; line-height: 1.6; margin-bottom: 16px; }
.hero-cat { display: inline-block; padding: 4px 14px; background: var(--site-primary); color: white; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-radius: 20px; }
.hero-date { font-size: 0.85rem; opacity: 0.7; }
.magazine-sidebar { background: var(--card-bg); display: flex; flex-direction: column; }
.side-item { display: flex; gap: 16px; padding: 20px; border-bottom: 1px solid var(--border-color); transition: background 0.3s ease; align-items: center; }
.side-item:last-child { border-bottom: none; }
.side-item:hover { background: rgba(0,0,0,0.03); }
.side-item img { width: 100px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.side-content h4 { font-size: 0.95rem; font-weight: 700; line-height: 1.35; color: var(--text-color); }
.side-cat { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--site-primary); display: block; margin-bottom: 6px; }
.news-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
.card-img-wrap { overflow: hidden; aspect-ratio: 16/10; }
.card-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.news-card:hover .card-img-wrap img { transform: scale(1.06); }
.news-card { background: var(--card-bg); border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); transition: all 0.35s ease; border: 1px solid rgba(0,0,0,0.04); }
.news-card:hover { transform: translateY(-6px); box-shadow: 0 12px 40px rgba(0,0,0,0.1); }
.news-content { padding: 20px; }
.news-category { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--site-primary); margin-bottom: 8px; display: block; }
.news-title { font-size: 1.15rem; font-weight: 700; line-height: 1.35; margin-bottom: 8px; color: var(--text-color); }
.news-desc { font-size: 0.9rem; color: var(--text-muted); line-height: 1.55; }
.news-date { font-size: 0.8rem; color: var(--text-muted); margin-top: 12px; display: block; opacity: 0.7; }
@media (max-width: 900px) { .magazine-hero { grid-template-columns: 1fr; } .news-grid { grid-template-columns: 1fr; } }
@media (max-width: 1200px) { .news-grid { grid-template-columns: repeat(2, 1fr); } }
""",

    "split": """
/* ===== SPLIT EDITORIAL LAYOUT ===== */
.split-editorial { display: flex; min-height: 100vh; }
.split-left { width: 45%; position: relative; }
.sticky-hero { position: sticky; top: 0; height: 100vh; }
.sticky-hero a { display: block; height: 100%; position: relative; }
.hero-img { width: 100%; height: 60%; background-size: cover; background-position: center; }
.hero-text { padding: 40px; background: var(--card-bg); }
.hero-text h1 { font-size: clamp(1.6rem, 2.5vw, 2.4rem); font-weight: 800; line-height: 1.2; margin: 16px 0; color: var(--text-color); }
.hero-text p { font-size: 1rem; color: var(--text-muted); line-height: 1.7; }
.hero-cat { display: inline-block; padding: 4px 14px; background: var(--site-primary); color: white; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-radius: 20px; }
.split-right { width: 55%; padding: 60px 48px; background: var(--background-color); }
.section-label { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: var(--site-primary); margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid var(--border-color); }
.editorial-list { display: flex; flex-direction: column; gap: 32px; }
.editorial-card { display: flex; gap: 24px; padding-bottom: 32px; border-bottom: 1px solid var(--border-color); transition: all 0.3s ease; }
.editorial-card:last-child { border-bottom: none; }
.editorial-card:hover { padding-left: 12px; }
.editorial-img { width: 200px; height: 150px; background-size: cover; background-position: center; border-radius: 8px; flex-shrink: 0; }
.editorial-body { flex: 1; }
.editorial-cat { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--site-primary); margin-bottom: 8px; display: block; }
.editorial-body h3 { font-size: 1.3rem; font-weight: 700; line-height: 1.3; margin-bottom: 10px; color: var(--text-color); }
.editorial-body p { font-size: 0.95rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 12px; }
.read-more { font-size: 0.85rem; font-weight: 700; color: var(--site-primary); text-transform: uppercase; letter-spacing: 1px; }
@media (max-width: 900px) { .split-editorial { flex-direction: column; } .split-left, .split-right { width: 100%; } .sticky-hero { position: relative; height: auto; } .editorial-card { flex-direction: column; } .editorial-img { width: 100%; height: 200px; } }
""",

    "bento": """
/* ===== BENTO BOX LAYOUT ===== */
.bento-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 200px; gap: 16px; max-width: 1400px; margin: 0 auto; padding: 0 24px; }
.bento-main { grid-column: span 2; grid-row: span 2; position: relative; overflow: hidden; border-radius: 24px; display: block; }
.bento-main img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
.bento-main:hover img { transform: scale(1.05); }
.bento-sub { position: relative; overflow: hidden; border-radius: 20px; display: block; }
.bento-sub img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.bento-sub:hover img { transform: scale(1.06); }
.bento-sub-1 { grid-column: span 1; grid-row: span 2; }
.bento-sub-2 { grid-column: span 1; grid-row: span 1; }
.bento-sub-3 { grid-column: span 1; grid-row: span 1; }
.bento-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px; background: linear-gradient(to top, rgba(0,0,0,0.85), transparent); color: white; }
.bento-overlay h1 { font-size: 1.8rem; font-weight: 800; line-height: 1.2; }
.bento-overlay h3 { font-size: 1.1rem; font-weight: 700; line-height: 1.3; }
.bento-cat { display: inline-block; padding: 3px 10px; background: var(--site-primary); color: white; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-radius: 12px; margin-bottom: 8px; }
.section-label { max-width: 1400px; margin: 48px auto 24px; padding: 0 24px; font-size: 1.4rem; font-weight: 800; color: var(--text-color); }
.bento-rest { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; max-width: 1400px; margin: 0 auto; padding: 0 24px 48px; }
.bento-mini { background: var(--card-bg); border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); transition: all 0.3s ease; display: block; }
.bento-mini:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
.bento-mini img { width: 100%; height: 160px; object-fit: cover; }
.mini-body { padding: 16px; }
.mini-cat { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--site-primary); margin-bottom: 6px; display: block; }
.mini-body h4 { font-size: 1rem; font-weight: 700; line-height: 1.35; color: var(--text-color); }
@media (max-width: 900px) { .bento-grid { grid-template-columns: repeat(2, 1fr); grid-auto-rows: 150px; } .bento-main { grid-column: span 2; grid-row: span 2; } }
@media (max-width: 600px) { .bento-grid { grid-template-columns: 1fr; } .bento-main { grid-column: span 1; } .bento-sub-1 { grid-column: span 1; grid-row: span 1; } }
""",

    "masonry": """
/* ===== MASONRY LAYOUT ===== */
.masonry-wall { column-count: 3; column-gap: 24px; max-width: 1400px; margin: 0 auto; padding: 0 24px; }
.masonry-brick { display: inline-block; width: 100%; margin-bottom: 24px; break-inside: avoid; background: var(--card-bg); border-radius: 4px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: all 0.35s ease; border: 1px solid var(--border-color); }
.masonry-brick:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
.brick-tall .brick-img { height: 350px; }
.brick-wide .brick-img { height: 200px; }
.brick-normal .brick-img { height: 250px; }
.brick-img { overflow: hidden; }
.brick-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.masonry-brick:hover .brick-img img { transform: scale(1.04); }
.brick-body { padding: 20px; }
.brick-cat { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--site-primary); margin-bottom: 8px; display: block; }
.brick-body h3 { font-size: 1.15rem; font-weight: 700; line-height: 1.35; margin-bottom: 8px; color: var(--text-color); }
.brick-body p { font-size: 0.9rem; color: var(--text-muted); line-height: 1.55; }
@media (max-width: 900px) { .masonry-wall { column-count: 2; } }
@media (max-width: 600px) { .masonry-wall { column-count: 1; } }
""",

    "list": """
/* ===== MINIMAL LIST LAYOUT ===== */
.list-layout { max-width: 900px; margin: 0 auto; padding: 0 24px; }
.list-featured { display: block; margin-bottom: 48px; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
.list-featured img { width: 100%; height: 400px; object-fit: cover; }
.featured-body { padding: 32px; background: var(--card-bg); }
.featured-cat { display: inline-block; padding: 4px 14px; background: var(--site-primary); color: white; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-radius: 20px; margin-bottom: 12px; }
.featured-body h1 { font-size: clamp(1.8rem, 3vw, 2.6rem); font-weight: 800; line-height: 1.2; margin: 12px 0; color: var(--text-color); }
.featured-body p { font-size: 1.1rem; color: var(--text-muted); line-height: 1.7; }
.article-list { display: flex; flex-direction: column; gap: 0; }
.list-item { display: flex; align-items: center; gap: 24px; padding: 28px 0; border-bottom: 1px solid var(--border-color); transition: all 0.3s ease; }
.list-item:hover { padding-left: 16px; }
.list-num { font-size: 2rem; font-weight: 800; color: var(--site-primary); opacity: 0.3; width: 50px; flex-shrink: 0; text-align: center; }
.list-img { width: 160px; height: 120px; flex-shrink: 0; border-radius: 8px; overflow: hidden; }
.list-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
.list-item:hover .list-img img { transform: scale(1.05); }
.list-body { flex: 1; }
.list-cat { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--site-primary); margin-bottom: 6px; display: block; }
.list-body h3 { font-size: 1.25rem; font-weight: 700; line-height: 1.35; margin-bottom: 8px; color: var(--text-color); }
.list-body p { font-size: 0.95rem; color: var(--text-muted); line-height: 1.55; }
@media (max-width: 768px) { .list-item { flex-direction: column; align-items: flex-start; } .list-num { font-size: 1.5rem; width: auto; } .list-img { width: 100%; height: 200px; } }
""",

    "cinematic": """
/* ===== CINEMATIC LAYOUT ===== */
.cinematic-hero { height: 70vh; background-size: cover; background-position: center; position: relative; display: flex; align-items: flex-end; margin-bottom: 48px; }
.cinematic-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 100%); }
.cinematic-content { position: relative; z-index: 2; max-width: 800px; padding: 60px; color: white; }
.cinematic-cat { display: inline-block; padding: 4px 14px; background: var(--site-primary); color: white; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-radius: 20px; margin-bottom: 16px; }
.cinematic-content h1 { font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 800; line-height: 1.15; margin-bottom: 16px; }
.cinematic-content p { font-size: 1.1rem; opacity: 0.85; line-height: 1.7; margin-bottom: 24px; }
.cinematic-btn { display: inline-block; padding: 14px 32px; background: var(--site-primary); color: white; font-weight: 700; text-decoration: none; border-radius: 8px; transition: all 0.3s ease; }
.cinematic-btn:hover { background: var(--site-secondary); transform: translateY(-2px); }
.cinematic-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; max-width: 1400px; margin: 0 auto; padding: 0 24px 48px; }
.cine-card { background: var(--card-bg); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); transition: all 0.35s ease; display: block; }
.cine-card:hover { transform: translateY(-6px); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
.cine-img { position: relative; height: 220px; overflow: hidden; }
.cine-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.cine-card:hover .cine-img img { transform: scale(1.06); }
.cine-img-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.6), transparent); opacity: 0; transition: opacity 0.3s ease; }
.cine-card:hover .cine-img-overlay { opacity: 1; }
.cine-body { padding: 24px; }
.cine-cat { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--site-primary); margin-bottom: 8px; display: block; }
.cine-body h3 { font-size: 1.2rem; font-weight: 700; line-height: 1.35; margin-bottom: 8px; color: var(--text-color); }
.cine-body p { font-size: 0.95rem; color: var(--text-muted); line-height: 1.55; }
@media (max-width: 768px) { .cinematic-content { padding: 32px; } }
""",

    "newspaper": """
/* ===== NEWSPAPER LAYOUT ===== */
.newspaper-masthead { text-align: center; padding: 40px 24px; border-bottom: 3px double var(--text-color); margin-bottom: 32px; }
.paper-title { font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 800; letter-spacing: -1px; text-transform: uppercase; color: var(--text-color); }
.paper-date { font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; text-transform: uppercase; letter-spacing: 2px; }
.newspaper-headline { max-width: 1000px; margin: 0 auto 40px; padding: 0 24px; text-align: center; }
.newspaper-headline a { display: block; }
.newspaper-headline h1 { font-size: clamp(2rem, 3.5vw, 3rem); font-weight: 800; line-height: 1.2; margin-bottom: 20px; color: var(--text-color); }
.newspaper-headline img { width: 100%; height: 400px; object-fit: cover; margin-bottom: 20px; }
.newspaper-headline p { font-size: 1.15rem; line-height: 1.7; color: var(--text-muted); column-count: 2; column-gap: 40px; text-align: left; }
.newspaper-subheads { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; max-width: 1000px; margin: 0 auto 40px; padding: 0 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 40px; }
.subhead-item { text-align: left; }
.subhead-item h3 { font-size: 1.3rem; font-weight: 700; line-height: 1.3; margin-bottom: 12px; color: var(--text-color); }
.subhead-item p { font-size: 0.95rem; line-height: 1.6; color: var(--text-muted); }
.newspaper-columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1000px; margin: 0 auto; padding: 0 24px 48px; }
.column-item { padding: 16px 0; border-top: 1px solid var(--border-color); }
.column-item h4 { font-size: 1.1rem; font-weight: 700; line-height: 1.35; margin-bottom: 8px; color: var(--text-color); }
.column-item p { font-size: 0.9rem; line-height: 1.55; color: var(--text-muted); }
@media (max-width: 768px) { .newspaper-subheads, .newspaper-columns { grid-template-columns: 1fr; } .newspaper-headline p { column-count: 1; } }
""",

    "bold": """
/* ===== BOLD MODERN LAYOUT ===== */
.bold-hero-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; max-width: 1400px; margin: 0 auto 48px; padding: 0 24px; }
.bold-hero { position: relative; overflow: hidden; border-radius: 8px; display: block; min-height: 400px; }
.bold-hero img { width: 100%; height: 100%; object-fit: cover; position: absolute; transition: transform 0.6s ease; }
.bold-hero:hover img { transform: scale(1.04); }
.bold-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 40px; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); color: white; }
.bold-overlay h2 { font-size: clamp(1.5rem, 2.5vw, 2.2rem); font-weight: 800; line-height: 1.2; margin: 12px 0; }
.bold-overlay p { font-size: 1rem; opacity: 0.85; line-height: 1.6; }
.bold-cat { display: inline-block; padding: 4px 14px; background: var(--site-primary); color: white; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-radius: 20px; }
.hero-secondary { min-height: 300px; }
.hero-secondary .bold-overlay h2 { font-size: 1.3rem; }
.bold-section-title { max-width: 1400px; margin: 0 auto 24px; padding: 0 24px; font-size: 1.6rem; font-weight: 800; color: var(--text-color); }
.bold-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; max-width: 1400px; margin: 0 auto; padding: 0 24px 48px; }
.bold-card { background: var(--card-bg); border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); transition: all 0.35s ease; display: block; border-top: 4px solid var(--site-primary); }
.bold-card:hover { transform: translateY(-6px); box-shadow: 0 12px 36px rgba(0,0,0,0.12); border-top-color: var(--site-secondary); }
.bold-img-wrap { height: 280px; overflow: hidden; }
.bold-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
.bold-card:hover .bold-img-wrap img { transform: scale(1.05); }
.bold-card-body { padding: 24px; }
.bold-card-body .bold-cat { margin-bottom: 10px; }
.bold-card-body h3 { font-size: 1.25rem; font-weight: 700; line-height: 1.35; margin-bottom: 10px; color: var(--text-color); }
.bold-card-body p { font-size: 0.95rem; color: var(--text-muted); line-height: 1.55; }
@media (max-width: 900px) { .bold-hero-row { grid-template-columns: 1fr; } .bold-grid { grid-template-columns: 1fr; } }
"""
}

def transform_site(site_name, site_dir):
    """Transform a single site with its assigned layout."""
    layout = LAYOUT_MAP.get(site_name)
    if not layout:
        print(f"Skipping {site_name} - no layout assigned")
        return

    index_path = os.path.join(site_dir, "index.html")
    style_path = os.path.join(site_dir, "style.css")

    if not os.path.exists(index_path):
        print(f"Skipping {site_name} - no index.html")
        return

    info = extract_site_info(index_path)
    new_script = get_layout_html(layout, info)

    with open(index_path, 'r') as f:
        html_content = f.read()

    # Replace the inline script
    script_pattern = r'<script>\s*\(async function\(\)\{.*?</script>'
    script_match = re.search(script_pattern, html_content, re.DOTALL)

    if script_match:
        html_content = html_content[:script_match.start()] + new_script + html_content[script_match.end():]
    else:
        print(f"Could not find script in {site_name}")
        return

    # Simplify main-content
    main_pattern = r'<main class="main-content">.*?</main>'
    main_match = re.search(main_pattern, html_content, re.DOTALL)
    if main_match:
        simple_main = '<main class="main-content">\n    </main>'
        html_content = html_content[:main_match.start()] + simple_main + html_content[main_match.end():]

    with open(index_path, 'w') as f:
        f.write(html_content)

    # Update style.css
    if os.path.exists(style_path):
        with open(style_path, 'r') as f:
            style_content = f.read()

        card_start = style_content.find("/* Card base styles")
        if card_start == -1:
            card_start = style_content.find(".news-card {")

        if card_start != -1:
            base_styles = style_content[:card_start].rstrip()
            new_css = CSS_TEMPLATES[layout]
            style_content = base_styles + "\n\n/* ===== LAYOUT STYLES ===== */\n" + new_css
            with open(style_path, 'w') as f:
                f.write(style_content)

    print(f"Transformed: {site_name} -> {layout}")


def main():
    sites = sorted(os.listdir(BASE_DIR))
    transformed = 0
    for site_name in sites:
        site_dir = os.path.join(BASE_DIR, site_name)
        if not os.path.isdir(site_dir) or site_name == "_shared":
            continue
        transform_site(site_name, site_dir)
        transformed += 1
    print(f"\nTransformed {transformed} sites.")

if __name__ == "__main__":
    main()
