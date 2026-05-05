#!/usr/bin/env python3
"""
Update all components.js to use logo images in headers and footers.
Also add favicon links to index.html files.
"""

import os
import re

BASE_DIR = "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-nuevos3/sites"

def get_site_info(site_dir):
    """Extract site display name and colors from components.js."""
    components_path = os.path.join(site_dir, "components.js")
    info = {"name": os.path.basename(site_dir), "gradient_start": "#0e7490", "gradient_end": "#2dd4bf"}
    
    if not os.path.exists(components_path):
        return info
    
    with open(components_path, 'r') as f:
        content = f.read()
    
    # Extract display name
    name_match = re.search(r'>([^<]+)</a></div></header>', content)
    if name_match:
        info["name"] = name_match.group(1)
    
    # Extract gradient colors
    grad_match = re.search(r'linear-gradient\(135deg,(#[0-9a-fA-F]{6})\s+0%,(#[0-9a-fA-F]{6})\s+100%', content)
    if grad_match:
        info["gradient_start"] = grad_match.group(1)
        info["gradient_end"] = grad_match.group(2)
    
    return info

def update_components_js(site_dir, site_name):
    """Update components.js to use logo images."""
    components_path = os.path.join(site_dir, "components.js")
    if not os.path.exists(components_path):
        return False
    
    info = get_site_info(site_dir)
    
    # Check if already updated
    with open(components_path, 'r') as f:
        content = f.read()
    
    if 'logo-header.png' in content:
        return False
    
    # Determine logo file name
    logo_name = "logo.png"
    if not os.path.exists(os.path.join(site_dir, "logo.png")):
        if os.path.exists(os.path.join(site_dir, "radiored.png")):
            logo_name = "radiored.png"
        else:
            return False
    
    # Create new components.js with logo support
    new_content = f"""(function() {{
  const path = window.location.pathname;
  const isSubdir = /\\/(articulo|categoria|admin)\\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {{
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="width:44px;height:44px;border:3px solid {info["gradient_end"]}80;border-top-color:{info["gradient_start"]};border-radius:50%;animation:spin 0.8s linear infinite;"></div><p style="margin-top:14px;font-weight:700;color:{info["gradient_start"]};font-size:0.85em;letter-spacing:1px;">{info["name"]}</p><style>@keyframes spin{{to{{transform:rotate(360deg)}}}}</style>';
    window.addEventListener('load', () => {{ setTimeout(() => el.classList.add('hidden'), 500); }});
  }}

  function injectHeader() {{
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = '<header style="background:linear-gradient(135deg,{info["gradient_start"]} 0%,{info["gradient_end"]} 100%);color:#fff;padding:10px 0;position:sticky;top:0;z-index:100;box-shadow:0 2px 10px rgba(0,0,0,0.1);"><div class="container" style="display:flex;align-items:center;justify-content:space-between;max-width:1200px;margin:0 auto;padding:0 24px;"><a href="' + base + '" style="display:flex;align-items:center;text-decoration:none;gap:12px;"><img src="' + base + 'logo-header.png" alt="{info["name"]}" style="height:42px;width:auto;object-fit:contain;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));"></a><nav style="display:flex;gap:20px;"><a href="' + base + '" style="color:rgba(255,255,255,0.9);text-decoration:none;font-weight:600;font-size:0.88em;">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" style="color:rgba(255,255,255,0.9);text-decoration:none;font-weight:600;font-size:0.88em;">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" style="color:rgba(255,255,255,0.9);text-decoration:none;font-weight:600;font-size:0.88em;">Politica</a><a href="' + base + 'categoria/index.html?cat=economia" style="color:rgba(255,255,255,0.9);text-decoration:none;font-weight:600;font-size:0.88em;">Economia</a></nav></div></header>';
  }}

  function injectFooter() {{
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer"><div style="text-align:center;margin-bottom:20px;"><img src="' + base + 'logo-footer.png" alt="{info["name"]}" style="height:32px;width:auto;object-fit:contain;opacity:0.9;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.2));"></div><p>&copy; ' + new Date().getFullYear() + ' {info["name"]}. Todos los derechos reservados.</p><p><a href="' + base + 'privacidad.html">Privacidad</a> | <a href="' + base + 'terminos.html">Terminos</a> | <a href="' + base + 'contacto.html">Contacto</a> | <a href="' + base + 'acerca-de.html">Acerca de</a></p></footer>';
  }}

  function init() {{ injectPreloader(); injectHeader(); injectFooter(); }}
  if (document.readyState === 'loading') {{ document.addEventListener('DOMContentLoaded', init); }} else {{ init(); }}
}})();"""
    
    with open(components_path, 'w') as f:
        f.write(new_content)
    
    return True

def add_favicon(site_dir):
    """Add favicon link to index.html and category pages."""
    files_to_update = []
    
    index_path = os.path.join(site_dir, "index.html")
    if os.path.exists(index_path):
        files_to_update.append(index_path)
    
    cat_index = os.path.join(site_dir, "categoria", "index.html")
    if os.path.exists(cat_index):
        files_to_update.append(cat_index)
    
    updated = 0
    for file_path in files_to_update:
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check if favicon already exists
        if 'favicon.png' in content or ('rel="icon"' in content and 'favicon' in content):
            continue
        
        # Determine path to favicon
        is_subdir = 'categoria' in file_path
        favicon_path = '../favicon.png' if is_subdir else 'favicon.png'
        
        favicon_link = f'<link rel="icon" type="image/png" href="{favicon_path}">'
        
        # Insert after the last link tag or before </head>
        head_end = content.find('</head>')
        if head_end != -1:
            # Find last <link before head_end
            last_link = content.rfind('<link', 0, head_end)
            if last_link != -1:
                # Find end of this tag
                link_end = content.find('>', last_link) + 1
                content = content[:link_end] + '\n    ' + favicon_link + content[link_end:]
            else:
                content = content[:head_end] + '    ' + favicon_link + '\n' + content[head_end:]
            
            with open(file_path, 'w') as f:
                f.write(content)
            updated += 1
    
    return updated

def main():
    sites = sorted(os.listdir(BASE_DIR))
    updated_components = 0
    added_favicons = 0
    
    for site_name in sites:
        site_dir = os.path.join(BASE_DIR, site_name)
        if not os.path.isdir(site_dir) or site_name == "_shared":
            continue
        
        if update_components_js(site_dir, site_name):
            updated_components += 1
            print(f"Updated components: {site_name}")
        
        fav_count = add_favicon(site_dir)
        if fav_count > 0:
            added_favicons += fav_count
            print(f"Added favicons: {site_name} ({fav_count})")
    
    print(f"\nDone!")
    print(f"Updated components.js: {updated_components}")
    print(f"Added favicons: {added_favicons}")

if __name__ == "__main__":
    main()
