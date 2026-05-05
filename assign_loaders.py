#!/usr/bin/env python3
"""
Assign unique CSS loaders to all sites across all CMS generations.
Uses the css-loader repo (300 pure CSS loaders) and adapts colors to each site's theme.
"""

import os
import re
import json
import random

# Base directories
CMS_DIRS = {
    "originaux": "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-originaux/sites",
    "nuevos": "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-nuevos/sites",
    "nuevos2": "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-nuevos2/sites",
    "nuevos3": "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-nuevos3/sites",
}

CSS_LOADER_DIR = "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/css-loader/js/loaders"

def parse_loaders():
    """Parse all loader definitions from css-loader JS files."""
    loaders = []
    
    for filename in sorted(os.listdir(CSS_LOADER_DIR)):
        if not filename.endswith('.js'):
            continue
        
        filepath = os.path.join(CSS_LOADER_DIR, filename)
        with open(filepath, 'r') as f:
            content = f.read()
        
        category = filename.replace('.js', '')
        
        # Extract individual loader objects using regex
        # Each loader has: id, html, css fields
        id_matches = list(re.finditer(r'id:\s*"([^"]+)"', content))
        html_matches = list(re.finditer(r'html:\s*`([^`]+)`', content))
        css_matches = list(re.finditer(r'css:\s*`([^`]+)`', content, re.DOTALL))
        
        count = min(len(id_matches), len(html_matches), len(css_matches))
        
        for i in range(count):
            loader = {
                "category": category,
                "id": id_matches[i].group(1),
                "html": html_matches[i].group(1).strip(),
                "css": css_matches[i].group(1).strip(),
            }
            loaders.append(loader)
    
    return loaders

def extract_site_colors(site_dir):
    """Extract primary colors from a site's CSS."""
    colors = {"primary": "#0e7490", "secondary": "#2dd4bf", "light": "#99f6e4"}
    
    # Try style-custom.css first
    for css_file in ["style-custom.css", "style.css"]:
        css_path = os.path.join(site_dir, css_file)
        if os.path.exists(css_path):
            with open(css_path, 'r') as f:
                content = f.read()
            
            # Look for --primary or --site-primary
            primary_match = re.search(r'--(?:site-)?primary[:\s]+(#[0-9a-fA-F]{6})', content)
            if primary_match:
                colors["primary"] = primary_match.group(1)
            
            secondary_match = re.search(r'--(?:site-)?secondary[:\s]+(#[0-9a-fA-F]{6})', content)
            if secondary_match:
                colors["secondary"] = secondary_match.group(1)
            
            light_match = re.search(r'--(?:site-)?light[:\s]+(#[0-9a-fA-F]{6})', content)
            if light_match:
                colors["light"] = light_match.group(1)
            
            # If no primary found, try other patterns
            if "primary" not in colors or colors["primary"] == "#0e7490":
                alt_primary = re.search(r'--(?:primary-color|accent|brand)[:\s]+(#[0-9a-fA-F]{6})', content)
                if alt_primary:
                    colors["primary"] = alt_primary.group(1)
            
            break
    
    return colors

def adapt_loader_css(css, colors):
    """Adapt loader CSS colors to match site theme."""
    # Common default colors in css-loader
    default_colors = {
        "#FFF": colors["light"],
        "#FFFFFF": colors["light"],
        "#FF3D00": colors["primary"],
        "#ff3d00": colors["primary"],
        "#0d161b": colors["primary"],
        "#263038": colors["secondary"],
        "#ff5722": colors["primary"],
        "#FF5722": colors["primary"],
        "#ff9800": colors["secondary"],
        "#FF9800": colors["secondary"],
        "#2196f3": colors["primary"],
        "#2196F3": colors["primary"],
        "#03a9f4": colors["secondary"],
        "#03A9F4": colors["secondary"],
        "#9c27b0": colors["primary"],
        "#9C27B0": colors["primary"],
        "#e91e63": colors["primary"],
        "#E91E63": colors["primary"],
        "#4caf50": colors["secondary"],
        "#4CAF50": colors["secondary"],
        "#8bc34a": colors["secondary"],
        "#8BC34A": colors["secondary"],
        "#f44336": colors["primary"],
        "#F44336": colors["primary"],
        "#00bcd4": colors["secondary"],
        "#00BCD4": colors["secondary"],
        "#009688": colors["primary"],
        "#009688": colors["primary"],
        "#673ab7": colors["primary"],
        "#673AB7": colors["primary"],
        "#3f51b5": colors["primary"],
        "#3F51B5": colors["primary"],
        "#795548": colors["primary"],
        "#607d8b": colors["secondary"],
        "#607D8B": colors["secondary"],
        "#ccc": colors["light"],
        "#CCCCCC": colors["light"],
        "#999": colors["light"],
        "#999999": colors["light"],
        "#333": "#1a1a1a",
        "#333333": "#1a1a1a",
    }
    
    adapted = css
    for old_color, new_color in default_colors.items():
        adapted = adapted.replace(old_color, new_color)
        # Also handle rgba versions
        if old_color == "#FFF" or old_color == "#FFFFFF":
            adapted = adapted.replace("rgba(255,255,255,", f"rgba({int(new_color[1:3],16)},{int(new_color[3:5],16)},{int(new_color[5:7],16)},")
    
    return adapted

def update_site_preloader(site_dir, loader, colors):
    """Update a site's components.js to use the assigned loader."""
    components_path = os.path.join(site_dir, "components.js")
    if not os.path.exists(components_path):
        return False
    
    with open(components_path, 'r') as f:
        content = f.read()
    
    # Adapt loader CSS
    adapted_css = adapt_loader_css(loader["css"], colors)
    
    # Add loader CSS to style-custom.css
    custom_css_path = os.path.join(site_dir, "style-custom.css")
    loader_css_block = f"\n\n/* ===== UNIQUE LOADER ({loader['category']}/{loader['id']}) ===== */\n{adapted_css}\n"
    
    if os.path.exists(custom_css_path):
        with open(custom_css_path, 'a') as f:
            f.write(loader_css_block)
    else:
        with open(custom_css_path, 'w') as f:
            f.write(loader_css_block)
    
    # Update components.js preloader to use loader HTML
    # The loader HTML is something like `<span class="loader"></span>`
    # We need to replace the preloader's spinner with this HTML
    
    loader_html = loader["html"].replace('`', '\\`').replace('$', '\\$')
    
    # Find and replace the preloader injection
    old_preloader_pattern = r"(el\.innerHTML = ')(<div style=\"width:\d+px;height:\d+px;border:[^']+)(</p><style>@keyframes spin\{to\{transform:rotate\(360deg\)\}\}</style>)';"
    
    # Simpler approach: replace the entire preloader innerHTML line
    new_preloader = f"""el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">{loader_html}<p style="font-weight:700;color:{colors['primary']};font-size:0.85em;letter-spacing:1px;">Cargando...</p></div>';"""
    
    # Try to find and replace the preloader line
    if 'site-preloader' in content:
        # Match the pattern where injectPreloader sets innerHTML
        preloader_match = re.search(
            r"(function injectPreloader\(\) \{[^}]+el\.innerHTML = ')([^']+)(';[^}]+\})",
            content,
            re.DOTALL
        )
        
        if preloader_match:
            content = content[:preloader_match.start(2)] + new_preloader.replace("el.innerHTML = '", "").replace("';", "") + content[preloader_match.end(2):]
        else:
            # Fallback: try simpler replacement
            # Find the line with el.innerHTML inside injectPreloader
            lines = content.split('\n')
            new_lines = []
            in_preloader = False
            replaced = False
            
            for i, line in enumerate(lines):
                if 'function injectPreloader' in line:
                    in_preloader = True
                if in_preloader and 'el.innerHTML' in line and not replaced:
                    indent = len(line) - len(line.lstrip())
                    new_lines.append(' ' * indent + f"el.innerHTML = '<div style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;\">{loader_html}<p style=\"font-weight:700;color:{colors['primary']};font-size:0.85em;letter-spacing:1px;\">Cargando...</p></div>';")
                    replaced = True
                    continue
                if in_preloader and line.strip() == '}' and not replaced:
                    # Didn't find el.innerHTML, add it before closing
                    indent = len(line) - len(line.lstrip())
                    new_lines.append(' ' * (indent + 2) + f"const el = document.getElementById('site-preloader');")
                    new_lines.append(' ' * (indent + 2) + f"if (!el) return;")
                    new_lines.append(' ' * (indent + 2) + f"el.innerHTML = '<div style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;\">{loader_html}<p style=\"font-weight:700;color:{colors['primary']};font-size:0.85em;letter-spacing:1px;\">Cargando...</p></div>';")
                    replaced = True
                new_lines.append(line)
            
            content = '\n'.join(new_lines)
    
    with open(components_path, 'w') as f:
        f.write(content)
    
    return True

def main():
    print("Parsing css-loader library...")
    all_loaders = parse_loaders()
    print(f"Found {len(all_loaders)} loaders")
    
    # Shuffle loaders for randomness but deterministic
    random.seed(42)
    shuffled_loaders = all_loaders.copy()
    random.shuffle(shuffled_loaders)
    
    loader_idx = 0
    total_sites = 0
    
    for cms_name, cms_dir in CMS_DIRS.items():
        if not os.path.exists(cms_dir):
            continue
        
        sites = sorted([s for s in os.listdir(cms_dir) if os.path.isdir(os.path.join(cms_dir, s)) and s != "_shared"])
        
        for site_name in sites:
            site_dir = os.path.join(cms_dir, site_name)
            
            if loader_idx >= len(shuffled_loaders):
                loader_idx = 0  # Loop back if we run out
            
            loader = shuffled_loaders[loader_idx]
            colors = extract_site_colors(site_dir)
            
            success = update_site_preloader(site_dir, loader, colors)
            if success:
                print(f"  [{cms_name}] {site_name} -> {loader['category']}/{loader['id']}")
                total_sites += 1
            else:
                print(f"  [{cms_name}] {site_name} -> SKIPPED (no components.js)")
            
            loader_idx += 1
    
    print(f"\nDone! Updated {total_sites} sites with unique loaders.")

if __name__ == "__main__":
    main()
