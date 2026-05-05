#!/usr/bin/env python3
"""
Generate dynamic category pages for all cms-nuevos3 sites.
Each site gets a categoria/index.html that reads ?cat= from URL
and filters articles via API.
"""

import os
import json

BASE_DIR = "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-nuevos3/sites"

# Category definitions
CATEGORIES = [
    {"slug": "nacional", "display": "Nacional"},
    {"slug": "politica", "display": "Política"},
    {"slug": "economia", "display": "Economía"},
    {"slug": "deportes", "display": "Deportes"},
    {"slug": "tecnologia", "display": "Tecnología"},
    {"slug": "cultura", "display": "Cultura"},
    {"slug": "internacional", "display": "Internacional"},
    {"slug": "ciencia", "display": "Ciencia"},
    {"slug": "entretenimiento", "display": "Entretenimiento"},
    {"slug": "salud", "display": "Salud"},
]

# Read the index.html of a site to extract its API URL and color
def get_site_info(site_dir):
    index_path = os.path.join(site_dir, "index.html")
    info = {"api_url": "", "placeholder_color": "0e7490", "title": "News"}
    
    if not os.path.exists(index_path):
        return info
    
    with open(index_path, 'r') as f:
        content = f.read()
    
    import re
    api_match = re.search(r'data-api="([^"]+)"', content)
    if api_match:
        info["api_url"] = api_match.group(1)
    
    ph_match = re.search(r'placehold\.co/[^/]+/([0-9a-fA-F#]+)', content)
    if ph_match:
        info["placeholder_color"] = ph_match.group(1).lstrip('#')
    
    title_match = re.search(r'<title>([^<]+)</title>', content)
    if title_match:
        info["title"] = title_match.group(1)
    
    return info

def generate_category_html(site_slug, site_info):
    """Generate a dynamic category page that reads ?cat= from URL."""
    color = site_info.get("placeholder_color", "0e7490")
    api_base = site_info.get("api_url", "")
    # Extract base API URL without query params
    api_base = api_base.split("?")[0] if api_base else f"https://cms-nuevos3.sebastianvernis.workers.dev/api/articles"
    title = site_info.get("title", "News")
    
    return f'''<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Categoría - {title}</title>
    <meta name="description" content="Noticias por categoría en {title}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
    <link rel="stylesheet" href="../style-custom.css">
</head>
<body>
    <div id="site-preloader"><div class="loader"></div></div>
    <div id="site-header"></div>

    <main class="main-content">
        <div class="category-page">
            <div class="category-header">
                <span class="category-badge" id="cat-badge">Categoría</span>
                <h1 class="section-title" id="cat-title">Noticias</h1>
                <p id="cat-desc">Artículos filtrados por categoría.</p>
            </div>
            <div id="cat-loading" style="text-align:center;padding:40px;"><p>Cargando noticias...</p></div>
            <div id="cat-empty" style="display:none;text-align:center;padding:40px;">
                <p>No hay noticias disponibles en esta categoría.</p>
                <a href="../index.html" style="font-weight:bold;">← Volver al inicio</a>
            </div>
            <div id="cat-grid" class="news-grid" style="display:none;margin-bottom:60px;"></div>
        </div>
    </main>

    <div id="site-footer"></div>
    <script src="../components.js"></script>
    <script>
    (function() {{
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('cat') || 'nacional';
        const categoryDisplay = category.charAt(0).toUpperCase() + category.slice(1);
        
        document.getElementById('cat-badge').textContent = categoryDisplay;
        document.getElementById('cat-title').textContent = 'Noticias de ' + categoryDisplay;
        document.getElementById('cat-desc').textContent = 'Todas las noticias actualizadas sobre ' + categoryDisplay + '.';
        document.title = categoryDisplay + ' - ' + document.title.replace('Categoría - ', '');
        
        const apiUrl = '{api_base}?site={site_slug}&category=' + encodeURIComponent(category) + '&limit=30';
        
        async function loadCategory() {{
            try {{
                const res = await fetch(apiUrl);
                if (!res.ok) throw new Error('fetch error');
                const data = await res.json();
                const articles = data.articles || [];
                
                if (!articles || !articles.length) {{
                    document.getElementById('cat-loading').style.display = 'none';
                    document.getElementById('cat-empty').style.display = 'block';
                    return;
                }}
                
                const grid = document.getElementById('cat-grid');
                grid.innerHTML = articles.map(a => renderCard(a)).join('');
                document.getElementById('cat-loading').style.display = 'none';
                grid.style.display = 'grid';
            }} catch(e) {{
                console.error('Error loading category:', e);
                document.getElementById('cat-loading').style.display = 'none';
                document.getElementById('cat-empty').style.display = 'block';
            }}
        }}
        
        function renderCard(a) {{
            const slug = a.slug || '';
            const img = a.imageUrl || 'https://placehold.co/600x400/{color}/ffffff?text=News';
            const cat = a.category || categoryDisplay;
            const title = escHtml(a.title || '');
            const excerpt = escHtml(a.excerpt || a.desc || '');
            const author = escHtml(a.author || 'Redacción');
            const date = a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('es-MX') : '';
            const url = '../articulo/?slug=' + encodeURIComponent(slug);
            
            return '<article class="news-card">' +
                '<div class="card-img-wrap">' +
                '<a href="' + url + '"><img src="' + img + '" alt="' + title + '" loading="lazy"></a>' +
                '</div>' +
                '<div class="news-content">' +
                '<span class="news-category">' + escHtml(cat) + '</span>' +
                '<h3 class="news-title"><a href="' + url + '">' + title + '</a></h3>' +
                '<p class="news-desc">' + excerpt + '</p>' +
                '<div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-muted);margin-top:12px;">' +
                '<span>Por ' + author + '</span>' +
                '<span>' + date + '</span>' +
                '</div></div></article>';
        }}
        
        function escHtml(s) {{
            if (!s) return '';
            return String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }}
        
        loadCategory();
    }})();
    </script>
</body>
</html>'''

def main():
    sites = sorted(os.listdir(BASE_DIR))
    created = 0
    
    for site_name in sites:
        site_dir = os.path.join(BASE_DIR, site_name)
        if not os.path.isdir(site_dir) or site_name == "_shared":
            continue
        
        # Create categoria directory
        cat_dir = os.path.join(site_dir, "categoria")
        os.makedirs(cat_dir, exist_ok=True)
        
        # Get site info
        site_info = get_site_info(site_dir)
        
        # Generate category index
        html = generate_category_html(site_name, site_info)
        cat_index = os.path.join(cat_dir, "index.html")
        with open(cat_index, 'w') as f:
            f.write(html)
        
        print(f"Created: {site_name}/categoria/index.html")
        created += 1
    
    print(f"\nDone! Created category pages for {created} sites.")

if __name__ == "__main__":
    main()
