#!/usr/bin/env python3
"""
Fix spacing issues in cms-nuevos3 sites - v2
Ensures category-page and layouts have proper mobile padding
"""

import os
import re

BASE_DIR = "/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-nuevos3/sites"

def get_sites():
    sites = []
    for d in os.listdir(BASE_DIR):
        path = os.path.join(BASE_DIR, d)
        if os.path.isdir(path) and not d.startswith('_'):
            sites.append(d)
    return sorted(sites)

def fix_style_css(site):
    path = os.path.join(BASE_DIR, site, "style.css")
    if not os.path.exists(path):
        return []

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    # 1. Ensure category-page padding is reduced in mobile
    # Check if there's already a 768px media query with category-page
    has_cat_mobile = re.search(r'@media\s*\(\s*max-width:\s*768px\s*\)\s*\{[^}]*\.category-page', content, re.DOTALL)

    if not has_cat_mobile:
        # Try to insert inside existing 768px media query
        mq_768 = re.search(r'(@media\s*\(\s*max-width:\s*768px\s*\)\s*\{)(.*?)(\})', content, re.DOTALL)
        if mq_768:
            # Insert category-page before the closing brace
            before_close = content[:mq_768.end()-1]
            after_close = content[mq_768.end()-1:]
            content = before_close + "\n    .category-page { padding: 30px var(--space-md); }\n" + after_close
            changes.append("Added category-page mobile padding in 768px MQ")
        else:
            # Add new media query at the end
            content = content.rstrip() + """

@media (max-width: 768px) {
    .category-page { padding: 30px var(--space-md); }
}
"""
            changes.append("Added 768px MQ with category-page padding")

    # 2. Add 600px mobile fixes for layouts
    has_600mq = '@media (max-width: 600px)' in content
    if not has_600mq:
        # Extract layout class names that have padding
        layout_classes = []
        for match in re.finditer(r'\.(\w+[\w-]*)\s*\{[^}]*padding:\s*0\s+24px', content):
            cls = match.group(1)
            if cls not in layout_classes:
                layout_classes.append(cls)

        padding_fixes = ""
        if layout_classes:
            selectors = ', '.join(f'.{c}' for c in layout_classes[:15])
            padding_fixes += f"    {selectors} {{ padding-left: var(--space-md) !important; padding-right: var(--space-md) !important; }}\n"

        # Add common fixes
        mobile_fix = f"""

/* ===== MOBILE SPACING FIXES ===== */
@media (max-width: 600px) {{
{padding_fixes}    .cinematic-content {{ padding: 30px var(--space-md); }}
    .bold-overlay {{ padding: 20px; }}
    .split-right {{ padding: 30px var(--space-md); }}
    .hero-text {{ padding: 24px var(--space-md); }}
    .newspaper-masthead {{ padding: 30px var(--space-md); }}
    .featured-body {{ padding: 24px; }}
    .editorial-card {{ gap: 16px; padding-bottom: 24px; }}
}}
"""
        content = content.rstrip() + mobile_fix
        changes.append("Added 600px mobile spacing fixes")

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

    return changes

def fix_style_custom_css(site):
    path = os.path.join(BASE_DIR, site, "style-custom.css")
    if not os.path.exists(path):
        return []

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    # Ensure mobile fixes exist
    has_768mq = '@media (max-width: 768px)' in content and '.container' in content
    has_600mq = '@media (max-width: 600px)' in content

    if not has_768mq or not has_600mq:
        mobile_fix = ""
        if not has_768mq:
            mobile_fix += """
/* ===== MOBILE SPACING FIXES ===== */
@media (max-width: 768px) {
    .container { padding: 0 var(--space-md) !important; }
    .site-footer { padding: 40px var(--space-md) 30px; }
    .legal-page { padding: 0 var(--space-md); }
}
"""
        if not has_600mq:
            mobile_fix += """
@media (max-width: 600px) {
    .site-footer { padding: 30px var(--space-sm); }
    .legal-page { padding: 0 var(--space-sm); }
    .news-grid { gap: 20px; }
}
"""
        content = content.rstrip() + mobile_fix
        changes.append("Added mobile spacing fixes to style-custom.css")

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)

    return changes

def main():
    sites = get_sites()
    print(f"Found {len(sites)} sites in cms-nuevos3")
    total_changes = 0

    for site in sites:
        style_changes = fix_style_css(site)
        custom_changes = fix_style_custom_css(site)

        if style_changes or custom_changes:
            print(f"\n✓ {site}:")
            for c in style_changes:
                print(f"  - style.css: {c}")
            for c in custom_changes:
                print(f"  - style-custom.css: {c}")
            total_changes += len(style_changes) + len(custom_changes)

    print(f"\nDone! Applied {total_changes} fixes.")

if __name__ == '__main__':
    main()
