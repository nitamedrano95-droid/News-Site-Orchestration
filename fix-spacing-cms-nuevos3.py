#!/usr/bin/env python3
"""
Fix spacing issues in cms-nuevos3 sites:
- Add horizontal padding to category pages
- Reduce padding on mobile for layouts
- Improve gaps and spacing on small screens
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

def add_spacing_fixes(content):
    """Add spacing fixes to style.css content"""
    original = content
    additions = []

    # 1. Add category-page styles if not present
    if '.category-page' not in content:
        category_css = """

/* ===== CATEGORY PAGE ===== */
.category-page { padding: 40px 24px; max-width: 1400px; margin: 0 auto; }
.category-header { margin-bottom: 32px; }
.category-badge { display: inline-block; padding: 4px 14px; background: var(--site-primary); color: white; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-radius: 20px; margin-bottom: 12px; }
"""
        content = content.rstrip() + category_css
        additions.append("Added .category-page padding")

    # 2. Add mobile spacing fixes
    has_600mq = '@media (max-width: 600px)' in content
    has_768mq = '@media (max-width: 768px)' in content

    mobile_fix = ""

    if not has_600mq and not has_768mq:
        # No mobile media queries at all - add comprehensive ones
        mobile_fix = """

/* ===== MOBILE SPACING FIXES ===== */
@media (max-width: 768px) {
    .container { padding: 0 var(--space-md); }
    .category-page { padding: 30px var(--space-md); }
    .bold-hero-row, .bold-grid, .bold-section-title,
    .cinematic-grid, .masonry-wall, .bento-grid, .bento-rest,
    .split-right, .section-label, .magazine-layout,
    .list-layout, .newspaper-headline {
        padding-left: var(--space-md) !important;
        padding-right: var(--space-md) !important;
    }
    .cinematic-content { padding: 30px var(--space-md); }
    .bold-overlay { padding: 20px; }
    .split-right { padding: 30px var(--space-md); }
    .editorial-card { gap: 16px; padding-bottom: 24px; }
    .hero-text { padding: 24px var(--space-md); }
    .newspaper-masthead { padding: 30px var(--space-md); }
    .featured-body { padding: 24px; }
    .masonry-wall { column-gap: 16px; }
}

@media (max-width: 600px) {
    .bento-grid { gap: 12px; }
    .bold-grid { gap: 20px; }
    .cinematic-grid { gap: 16px; }
    .editorial-list { gap: 24px; }
    .magazine-hero { gap: 1px; }
}
"""
    elif has_768mq and '.category-page' not in content:
        # Has 768px media query but missing category-page fix
        # Insert category-page inside the 768px media query
        pattern = r'(@media \(max-width: 768px\) \{)'
        replacement = r'\1\n    .category-page { padding: 30px var(--space-md); }'
        content = re.sub(pattern, replacement, content, count=1)
        additions.append("Added category-page mobile padding")

        # Also add general mobile padding fix if not present
        if 'padding-left: var(--space-md)' not in content:
            mobile_fix = """

/* ===== MOBILE SPACING FIXES ===== */
@media (max-width: 600px) {
    .bold-hero-row, .bold-grid, .bold-section-title,
    .cinematic-grid, .masonry-wall, .bento-grid, .bento-rest,
    .split-right, .section-label, .magazine-layout,
    .list-layout, .newspaper-headline {
        padding-left: var(--space-md) !important;
        padding-right: var(--space-md) !important;
    }
    .cinematic-content { padding: 30px var(--space-md); }
    .bold-overlay { padding: 20px; }
    .split-right { padding: 30px var(--space-md); }
    .hero-text { padding: 24px var(--space-md); }
    .newspaper-masthead { padding: 30px var(--space-md); }
    .featured-body { padding: 24px; }
    .bento-grid { gap: 12px; }
    .bold-grid { gap: 20px; }
    .cinematic-grid { gap: 16px; }
    .editorial-list { gap: 24px; }
}
"""

    if mobile_fix:
        content = content.rstrip() + mobile_fix
        additions.append("Added mobile spacing fixes")

    return content, additions

def fix_style_css(site):
    path = os.path.join(BASE_DIR, site, "style.css")
    if not os.path.exists(path):
        return []

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content, changes = add_spacing_fixes(content)

    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)

    return changes

def fix_style_custom_css(site):
    path = os.path.join(BASE_DIR, site, "style-custom.css")
    if not os.path.exists(path):
        return []

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    # Check if mobile fixes already exist
    has_mobile_fix = '@media (max-width: 600px)' in content and 'padding' in content

    if not has_mobile_fix:
        mobile_fix = """

/* ===== MOBILE SPACING FIXES ===== */
@media (max-width: 768px) {
    .container { padding: 0 var(--space-md) !important; }
    .site-footer { padding: 40px var(--space-md) 30px; }
    .legal-page { padding: 0 var(--space-md); }
}

@media (max-width: 600px) {
    .site-footer { padding: 30px var(--space-sm); }
    .legal-page { padding: 0 var(--space-sm); }
    .news-grid { gap: 20px; }
}
"""
        content = content.rstrip() + mobile_fix
        changes.append("Added mobile spacing fixes")

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
        else:
            print(f"  {site}: no changes needed")

    print(f"\nDone! Applied {total_changes} fixes across {len(sites)} sites.")

if __name__ == '__main__':
    main()
