#!/usr/bin/env python3
"""
Scaffold de 25 sitios para cms-nuevos4 (Fase 1 — solo local).
Cero Cloudflare: solo filesystem en cms-nuevos4/public/{slug}/

Outputs por sitio:
  - index.html            (API URL chispakimnueve, slug del JSON)
  - wrangler.toml         (D1 news_db_cms_nuevos4)
  - _redirects            (proxy api/* al worker chispakimnueve)
  - style-custom.css      (paleta del JSON + postura editorial)
  - components.js         (nav por postura, API URL chispakimnueve)
  - logo.png / logo-header.png / logo-footer.png / favicon.png  (PIL placeholders)
  - copia idéntica de style.css, script.js, sw.js, robots.txt, etc.
  - functions/_middleware.js + functions/articulo/[slug].js (siten en _shared)
  - acerca-de.html / contacto.html / privacidad.html / terminos.html
  - categoria/index.html + articulo/index.html
"""
import os
import json
import shutil
import textwrap
import glob

from PIL import Image, ImageDraw, ImageFont

# ─── CONSTANTES ─────────────────────────────────────────────────────────────
WORKER_URL   = "https://cms-nuevos4.chispakimnueve.workers.dev"
D1_NAME      = "news_db_cms_nuevos4"
D1_ID        = "3230c0c3-c1ac-4a90-b827-675222b1b878"
TEMPLATE     = "/home/sebastianvernis/projects/News-Site-Orchestration/cms-nuevos3/sites/diariomexicano"
OUT_ROOT     = "/home/sebastianvernis/projects/News-Site-Orchestration/cms-nuevos4/public"
SHARED_OUT   = os.path.join(OUT_ROOT, "_shared")
DATA_DIR     = "/home/sebastianvernis/projects/News-Site-Orchestration/data/sites/cms-nuevos4"
FONTS_DIR   = "/usr/share/fonts/truetype"

# ─── MAPAS ──────────────────────────────────────────────────────────────────
# (display, body) Google Fonts — 25 familias distintas
FONT_MAP = {
    "bitacorainformativa":    ("IBM Plex Serif",     "IBM Plex Mono"),
    "codigomexico":           ("Space Grotesk",      "Space Grotesk"),
    "contextomexicano":       ("Inter",              "Inter"),
    "cronicanacionalmx":      ("Playfair Display",   "Lora"),
    "diariodelarepublica":    ("Old Standard TT",    "Merriweather"),
    "diarioglobalmexico":     ("Source Serif 4",     "Source Serif 4"),
    "enlacediariomexico":     ("Roboto Slab",        "Roboto"),
    "espectromexicano":       ("Space Grotesk",      "Inter"),
    "expresodemexico":        ("Archivo Black",      "Archivo Black"),
    "focoinformativomx":      ("Bebas Neue",         "Bebas Neue"),
    "frenteinformativo":      ("Roboto Condensed",   "Roboto Condensed"),
    "horizonteinformativo":   ("Manrope",            "Inter"),
    "impactodiariomexico":    ("Anton",              "Anton"),
    "nexoinformativo":        ("Space Grotesk",      "JetBrains Mono"),
    "noticiasdeldiamx":       ("Inter",              "Inter"),
    "planacentral":           ("IBM Plex Sans",      "IBM Plex Sans"),
    "prensaciudadana":        ("Nunito",             "Nunito"),
    "puntocriticonoticias":   ("Oswald",             "Oswald"),
    "radarnacional":          ("Space Grotesk",      "Space Mono"),
    "referenteinformativo":   ("Inter",              "Inter"),
    "reportedevanguardia":    ("IBM Plex Sans",      "IBM Plex Serif"),
    "rutanacionalnoticias":   ("Manrope",            "Inter"),
    "sintagmanacional":       ("Playfair Display",   "Playfair Display"),
    "sintesisinformativa":    ("Inter",              "Inter"),
    "visionnacionalnoticias": ("Space Grotesk",      "Inter"),
}

# Postura editorial por sitio (define nav items, header style, hero)
POSTURE = {
    "bitacorainformativa":    "narrativa",
    "codigomexico":           "tecnico",
    "contextomexicano":       "data",
    "cronicanacionalmx":      "magazine",
    "diariodelarepublica":    "narrativa",
    "diarioglobalmexico":     "magazine",
    "enlacediariomexico":     "urgente",
    "espectromexicano":       "data",
    "expresodemexico":        "urgente",
    "focoinformativomx":      "urgente",
    "frenteinformativo":      "urgente",
    "horizonteinformativo":   "data",
    "impactodiariomexico":    "urgente",
    "nexoinformativo":        "tecnico",
    "noticiasdeldiamx":       "urgente",
    "planacentral":           "narrativa",
    "prensaciudadana":        "narrativa",
    "puntocriticonoticias":   "data",
    "radarnacional":          "tecnico",
    "referenteinformativo":   "magazine",
    "reportedevanguardia":    "magazine",
    "rutanacionalnoticias":   "narrativa",
    "sintagmanacional":       "magazine",
    "sintesisinformativa":    "tecnico",
    "visionnacionalnoticias": "data",
}

# Nav items por postura + dominio curado para los urgentes
NAV_BY_POSTURE = {
    "urgente":  ["Nacional", "Política", "Economía", "Mundo", "Seguridad", "Última Hora"],
    "magazine": ["Reportajes", "Perfiles", "Ensayo", "Fotonacional", "Archivo", "Cartas"],
    "data":     ["Indicadores", "Macroeconomía", "Inflación", "Empleo", "Series", "Metodología"],
    "narrativa":["Crónica", "Territorio", "Memoria", "Voces", "Archivo", "Relatos"],
    "tecnico":  ["Signal", "Pipeline", "Logs", "Status", "RSS", "Endpoints"],
}
URGENTE_DOMAINS = {
    "focoinformativomx":      ["Flash", "Policiaca", "Seguridad", "Justicia", "CDMX", "Estados"],
    "enlacediariomexico":     ["Política", "Congreso", "Elecciones", "Partidos", "Op-Ed", "Columnas"],
    "impactodiariomexico":    ["Mercados", "Empresas", "Bolsa", "Divisas", "Banxico", "Energía"],
    "expresodemexico":        ["Mundo", "Frontera", "EU", "Latinoamérica", "Europa", "Asia"],
    "noticiasdeldiamx":       ["Hoy", "Mañana", "Resumen", "Titulares", "Lo último", "Más leído"],
    "frenteinformativo":      ["Reportes", "Testimonios", "Comunidades", "Derechos", "Territorio", "Voces"],
}

# ─── UTILS ──────────────────────────────────────────────────────────────────
def hex_to_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c*2 for c in h)
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def hex_to_rgba(h, a=255):
    r, g, b = hex_to_rgb(h)
    return (r, g, b, a)

def shade(hex_color, factor):
    """factor < 1: oscurece, factor > 1: aclara"""
    r, g, b = hex_to_rgb(hex_color)
    if factor < 1:
        r, g, b = int(r*factor), int(g*factor), int(b*factor)
    else:
        r, g, b = min(255, int(r*factor)), min(255, int(g*factor)), min(255, int(b*factor))
    return "#{:02x}{:02x}{:02x}".format(r, g, b)

def light_color(hex_color):
    """Mezcla hacia blanco para un color light/pastel"""
    r, g, b = hex_to_rgb(hex_color)
    return "#{:02x}{:02x}{:02x}".format(
        int(r + (255 - r) * 0.85),
        int(g + (255 - g) * 0.85),
        int(b + (255 - b) * 0.85),
    )

# ─── DERIVACIÓN DE TOKENS ───────────────────────────────────────────────────
def derive_tokens(theme):
    primary   = theme["color_primario"]
    secondary = theme["color_secundario"]
    light     = light_color(primary)
    bg        = light_color(light_color(primary))  # casi neutro
    text      = shade(primary, 0.18)               # texto oscuro derivado
    header    = shade(primary, 0.85)               # header más oscuro
    return {
        "primary":   primary,
        "secondary": secondary,
        "light":     light,
        "bg":        bg,
        "text":      text,
        "header":    header,
    }

# ─── LOGO PLACEHOLDER ───────────────────────────────────────────────────────
def render_logo(out_path, slug, nombre, primary, secondary, variant="header"):
    """
    Genera un PNG placeholder: cuadrado pequeño (favicon) o banner (logos).
    variant: 'favicon' (96x96), 'header' (256x80), 'footer' (256x80), 'main' (512x160)
    """
    if variant == "favicon":
        w, h = 96, 96
    elif variant == "header":
        w, h = 256, 80
    elif variant == "footer":
        w, h = 256, 80
    else:  # main
        w, h = 512, 160

    img = Image.new("RGBA", (w, h), hex_to_rgba(secondary, 255))
    draw = ImageDraw.Draw(img)

    # Marca: cuadrado con iniciales
    initials = "".join(w[0] for w in nombre.split()[:2]).upper()
    if not initials:
        initials = slug[:2].upper()

    # Buscar fuente del sistema
    font_path = None
    for cand in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]:
        if os.path.exists(cand):
            font_path = cand
            break

    if variant == "favicon":
        font = ImageFont.truetype(font_path, 48) if font_path else ImageFont.load_default()
        # Cuadrado blanco centrado con iniciales
        size = int(w * 0.7)
        x0 = (w - size) // 2; y0 = (h - size) // 2
        draw.rectangle([x0, y0, x0+size, y0+size], fill=hex_to_rgba(primary, 255))
        bbox = draw.textbbox((0, 0), initials, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((w - tw) // 2 - bbox[0], (h - th) // 2 - bbox[1]),
                  initials, fill=hex_to_rgba("#ffffff", 255), font=font)
    else:
        # Banner: rectángulo full-width con el nombre
        font = ImageFont.truetype(font_path, max(18, h // 3)) if font_path else ImageFont.load_default()
        # Banda lateral primary
        band_w = int(h * 0.4)
        draw.rectangle([0, 0, band_w, h], fill=hex_to_rgba(primary, 255))
        # Texto
        text_x = band_w + 16
        text_color = hex_to_rgba("#ffffff", 255) if variant != "footer" else hex_to_rgba(primary, 255)
        # Si footer: fondo blanco + texto primary
        if variant == "footer":
            draw.rectangle([0, 0, w, h], fill=hex_to_rgba("#ffffff", 255))
            text_color = hex_to_rgba(secondary, 255)
        bbox = draw.textbbox((0, 0), nombre.upper(), font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        if tw > w - text_x - 16:
            # Truncar a N palabras que quepan
            words = nombre.upper().split()
            for n in range(len(words), 0, -1):
                test = " ".join(words[:n])
                bb = draw.textbbox((0, 0), test, font=font)
                if bb[2] - bb[0] <= w - text_x - 16:
                    text_to_draw = test
                    break
            else:
                text_to_draw = words[0]
        else:
            text_to_draw = nombre.upper()
        bbox = draw.textbbox((0, 0), text_to_draw, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((text_x, (h - th) // 2 - bbox[1]), text_to_draw,
                  fill=text_color, font=font)

    img.save(out_path, "PNG")

# ─── CSS POR POSTURA ────────────────────────────────────────────────────────
def css_for_site(slug, nombre, theme, posture, fonts):
    tokens = derive_tokens(theme)
    primary, secondary, light, bg, text, header = (
        tokens["primary"], tokens["secondary"], tokens["light"],
        tokens["bg"], tokens["text"], tokens["header"],
    )
    display, body = fonts
    prefix = slug.replace("-", "").replace("_", "")[:8]  # para CSS class prefix
    font_stack_disp = f"'{display}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    if "Serif" in display or "Display" in display or "Roman" in display or "TT" in display or "Lora" in display or "Merriweather" in display or "Source Serif" in display:
        font_stack_disp = f"'{display}', 'Iowan Old Style', Georgia, serif"
    font_stack_body = f"'{body}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    if "Mono" in body or "Mono" in display:
        font_stack_body = f"'{body}', ui-monospace, 'IBM Plex Mono', Menlo, monospace"

    # Postura-specific tweaks
    if posture == "urgente":
        body_weight = "700"
        letter = "0.04em"
    elif posture == "magazine":
        body_weight = "400"
        letter = "0"
    elif posture == "data":
        body_weight = "500"
        letter = "-0.005em"
    elif posture == "narrativa":
        body_weight = "400"
        letter = "0"
    else:  # tecnico
        body_weight = "500"
        letter = "0"

    return textwrap.dedent(f"""
    /* ============================================================
       {nombre} — style-custom.css
       Postura: {posture}  ·  Slug: {slug}
       Generado por scaffold_new_sites.py
       ============================================================ */
    :root {{
      --primary: {primary};
      --secondary: {secondary};
      --light: {light};
      --bg: {bg};
      --text: {text};
      --header: {header};
    }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: {font_stack_body};
      font-weight: {body_weight};
      letter-spacing: {letter};
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }}
    h1, h2, h3, h4, h5, h6 {{
      font-family: {font_stack_disp};
      color: var(--text);
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }}

    /* ===== {nombre.upper()} TICKER ===== */
    .{prefix}-ticker {{
      display: flex;
      align-items: center;
      background: linear-gradient(135deg, {header} 0%, {secondary} 100%);
      color: #fff;
      height: 44px;
      overflow: hidden;
    }}
    .ticker-{prefix}-left {{ display: flex; align-items: center; flex-shrink: 0; }}
    .ticker-{prefix}-logo {{
      display: flex; align-items: center; padding: 0 12px; height: 100%;
      background: #fff; flex-shrink: 0;
    }}
    .ticker-{prefix}-logo img {{ height: 28px; width: auto; object-fit: contain; }}
    .ticker-{prefix}-viewport {{ flex: 1; overflow: hidden; white-space: nowrap; position: relative; }}
    .ticker-{prefix}-inner {{ display: inline-block; white-space: nowrap; }}
    .ticker-{prefix}-item {{
      color: rgba(255,255,255,0.9); text-decoration: none; font-size: 0.8em;
      padding: 0 16px; white-space: nowrap; transition: color 0.3s;
    }}
    .ticker-{prefix}-item:hover {{ color: #fff; }}
    .ticker-{prefix}-sep {{ color: {secondary}; padding: 0 4px; }}
    .ticker-{prefix}-loading {{ color: rgba(255,255,255,0.5); font-size: 0.8em; font-style: italic; }}
    .ticker-{prefix}-right {{ display: flex; align-items: center; gap: 12px; flex-shrink: 0; padding: 0 12px; }}
    .ticker-{prefix}-time {{
      background: {light}; color: {primary};
      font-weight: 800; font-size: 0.7em;
      padding: 4px 10px; border-radius: 4px; letter-spacing: 1px;
    }}
    .ticker-{prefix}-social {{ display: flex; gap: 8px; }}
    .ticker-{prefix}-social a {{
      color: rgba(255,255,255,0.7); text-decoration: none; width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center; border-radius: 4px;
      transition: all 0.3s; font-size: 0.85em;
    }}
    .ticker-{prefix}-social a:hover {{ color: #fff; background: rgba(255,255,255,0.15); }}

    /* ===== {nombre.upper()} HEADER ===== */
    .site-header-{prefix} {{
      background: linear-gradient(135deg, {primary} 0%, {secondary} 100%);
      padding: 0;
    }}
    .header-{prefix}-nav {{ padding: 0 24px; }}
    .nav-{prefix}-inner {{
      display: flex; align-items: center; justify-content: center;
      gap: 4px; height: 48px;
    }}
    .nav-{prefix}-link {{
      color: rgba(255,255,255,0.85); text-decoration: none;
      font-weight: 600; font-size: 0.8em; letter-spacing: 0.5px;
      padding: 6px 14px; border-radius: 4px; transition: all 0.3s; white-space: nowrap;
    }}
    .nav-{prefix}-link:hover {{ color: #fff; background: rgba(255,255,255,0.15); }}
    .nav-{prefix}-link.active {{ background: rgba(255,255,255,0.2); color: #fff; }}

    /* ===== {nombre.upper()} FOOTER ===== */
    .site-footer-{prefix} {{ background: {primary}; padding: 36px 20px 20px; margin-top: 60px; }}
    .footer-{prefix}-inner {{ max-width: 800px; margin: 0 auto; }}
    .footer-{prefix}-grid {{
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px;
      max-width: 480px; margin: 0 auto 20px;
    }}
    .footer-{prefix}-col {{ text-align: center; }}
    .footer-{prefix}-title {{
      font-size: 0.7em; font-weight: 800; letter-spacing: 2px;
      text-transform: uppercase; color: {light};
      margin-bottom: 12px; padding-bottom: 8px;
      border-bottom: 2px solid {secondary}; display: inline-block;
    }}
    .footer-{prefix}-list {{ list-style: none; display: flex; flex-direction: column; gap: 8px; }}
    .footer-{prefix}-list li a {{
      color: rgba(255,255,255,0.7); text-decoration: none;
      font-size: 0.85em; transition: color 0.3s;
    }}
    .footer-{prefix}-list li a:hover {{ color: {light}; }}
    .footer-{prefix}-bottom {{
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 14px; text-align: center;
      font-size: 0.75em; color: rgba(255,255,255,0.45);
    }}

    /* ===== MOBILE ===== */
    @media (max-width: 768px) {{
      .footer-{prefix}-grid {{ grid-template-columns: 1fr; }}
      .nav-{prefix}-inner {{ overflow-x: auto; }}
    }}
    """).strip() + "\n"

# ─── COMPONENTS.JS POR SITIO ────────────────────────────────────────────────
def components_js(slug, nombre, posture, theme):
    prefix = slug.replace("-", "").replace("_", "")[:8]
    primary = theme["color_primario"]
    items = URGENTE_DOMAINS.get(slug, NAV_BY_POSTURE[posture])
    items_js = "[" + ", ".join(f'"{i}"' for i in items) + "]"
    return textwrap.dedent(f"""
    (function() {{
      const path = window.location.pathname;
      const isSubdir = /\\/(articulo|categoria|admin)\\//.test(path);
      const base = isSubdir ? '../' : './';
      const SITE = '{slug}';
      const SITE_NAME = '{nombre}';
      const PRIMARY = '{primary}';
      const ITEMS = {items_js};

      function injectPreloader() {{
        const el = document.getElementById('site-preloader');
        if (!el) return;
        el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="{prefix}-loader"><div class="{prefix}-bar"></div><div class="{prefix}-bar"></div><div class="{prefix}-bar"></div></div><p style="font-weight:700;color:' + PRIMARY + ';font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
        window.addEventListener('load', () => {{ setTimeout(() => el.classList.add('hidden'), 500); }});
      }}

      function injectTicker() {{
        const el = document.getElementById('site-header');
        if (!el) return;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-MX', {{ hour: '2-digit', minute: '2-digit' }});
        el.insertAdjacentHTML('beforebegin', '<div class="{prefix}-ticker"><div class="ticker-{prefix}-left"><div class="ticker-{prefix}-logo"><img src="' + base + 'logo-header.png" alt="' + SITE + '"></div><div class="ticker-{prefix}-msg">{nombre.upper()}</div></div><div class="ticker-{prefix}-viewport" id="ticker-{prefix}-viewport"><div class="ticker-{prefix}-inner" id="ticker-{prefix}-inner"><span class="ticker-{prefix}-loading">Cargando...</span></div></div><div class="ticker-{prefix}-right"><div class="ticker-{prefix}-time">' + timeStr + '</div><div class="ticker-{prefix}-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
        fetchTicker();
      }}

      async function fetchTicker() {{
        const inner = document.getElementById('ticker-{prefix}-inner');
        if (!inner) return;
        try {{
          const res = await fetch('{WORKER_URL}/api/articles?site=' + SITE + '&limit=5');
          if (!res.ok) throw new Error('Network');
          const data = await res.json();
          const articles = data.articles || [];
          if (!articles.length) {{ inner.innerHTML = '<span>Sin noticias</span>'; return; }}
          const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-{prefix}-item">' + a.title + '</a>').join('<span class="ticker-{prefix}-sep">•</span>');
          inner.innerHTML = items + items;
          start{prefix.capitalize()}Ticker();
        }} catch(e) {{
          inner.innerHTML = '<span>{nombre} • Tu fuente de noticias</span>';
          start{prefix.capitalize()}Ticker();
        }}
      }}

      function start{prefix.capitalize()}Ticker() {{
        const inner = document.getElementById('ticker-{prefix}-inner');
        const viewport = document.getElementById('ticker-{prefix}-viewport');
        if (!inner || !viewport) return;
        let pos = 0;
        const speed = 0.8;
        const halfWidth = inner.scrollWidth / 2;
        function tick() {{
          pos -= speed;
          if (pos <= -halfWidth) pos = 0;
          inner.style.transform = 'translateX(' + pos + 'px)';
          requestAnimationFrame(tick);
        }}
        requestAnimationFrame(tick);
      }}

      function injectHeader() {{
        const el = document.getElementById('site-header');
        if (!el) return;
        const links = ITEMS.map((label, i) => '<a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\\s+/g, '-') + '" class="nav-{prefix}-link' + (i === 0 ? ' active' : '') + '">' + label + '</a>').join('');
        el.innerHTML = '<header class="site-header-{prefix}"><nav class="header-{prefix}-nav"><div class="nav-{prefix}-inner">' + links + '</div></nav></header>';
      }}

      function injectFooter() {{
        const el = document.getElementById('site-footer');
        if (!el) return;
        const footerLinks = ITEMS.slice(0, 3).map(label => '<li><a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\\s+/g, '-') + '">' + label + '</a></li>').join('');
        el.innerHTML = '<footer class="site-footer-{prefix}"><div class="footer-{prefix}-inner"><div class="footer-{prefix}-grid"><div class="footer-{prefix}-col"><span class="footer-{prefix}-title">Secciones</span><ul class="footer-{prefix}-list">' + footerLinks + '</ul></div><div class="footer-{prefix}-col"><span class="footer-{prefix}-title">Legal</span><ul class="footer-{prefix}-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-{prefix}-bottom">© ' + new Date().getFullYear() + ' {nombre}. Todos los derechos reservados.</div></div></footer>';
      }}

      function init() {{ injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }}
      if (document.readyState === 'loading') {{ document.addEventListener('DOMContentLoaded', init); }} else {{ init(); }}
    }})();
    """).strip() + "\n"

# ─── INDEX.HTML ─────────────────────────────────────────────────────────────
def index_html(slug, nombre, theme, tagline):
    return textwrap.dedent(f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="utf-8"/>
        <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
        <title>{nombre} - News</title>
        <meta content="{tagline}" name="description"/>
        <link href="https://fonts.googleapis.com" rel="preconnect"/>
        <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" media="print" onload="this.media='all'"/>
        <link href="style.css" rel="stylesheet" media="print" onload="this.media='all'"/>
        <link href="style-custom.css" rel="stylesheet" media="print" onload="this.media='all'"/>
        <link rel="alternate" type="application/rss+xml" title="{nombre} RSS" href="/rss.xml"/>
        <link rel="manifest" href="manifest.json">
        <link rel="icon" type="image/png" href="favicon.png">
        <meta name="theme-color" content="{theme['color_primario']}">
    </head>
    <body>
        <div id="site-preloader"><div class="loader"></div></div>
        <div id="site-header"></div>

        <main class="main-content" style="margin-top: 10px;">
        </main>

        <div id="site-footer"></div>

        <script src="pwa-manager.js" defer></script>
        <script src="script.js" defer></script>
        <script src="components.js" defer></script>
        <script>
        (async function(){{
            function isWeatherArticle(t){{return t&&(t.includes('Clima')||t.includes('No Circula')||t.includes('Hoy No'));}}
            const apiUrl = '{WORKER_URL}/api/articles?site={slug}&limit=12';
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
                    const descLen = i % 3 === 0 ? 200 : 80;
                    return '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="masonry-brick brick-' + shape + '">' +
                        '<div class="brick-img"><img src="' + (isWeatherArticle(a.title)?'./logo.png':(a.imageUrl||'./logo-header.png')) + '" alt="' + a.title + '"></div>' +
                        '<div class="brick-body"><span class="brick-cat">' + (a.category || 'Noticias') + '</span>' +
                        '<h3>' + a.title + '</h3><p>' + (a.excerpt ? a.excerpt.substring(0, descLen) + '...' : '') + '</p></div></a>';
                }}).join('') + '</div>';
            }}
        }})();
        </script>
    </body>
        <script>if('serviceWorker' in navigator){{window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{{}}))}}</script>
    </html>
    """).strip() + "\n"

# ─── WRANGLER.TOML ──────────────────────────────────────────────────────────
def wrangler_toml(slug):
    return textwrap.dedent(f"""
    name = "{slug}"
    pages_build_output_dir = "."
    compatibility_date = "2024-01-01"

    [[d1_databases]]
    binding = "DB"
    database_name = "{D1_NAME}"
    database_id = "{D1_ID}"
    """).strip() + "\n"

# ─── _REDIRECTS ─────────────────────────────────────────────────────────────
def redirects(slug):
    return textwrap.dedent(f"""
    # Proxy /api/* al worker de noticias
    /api/* {WORKER_URL}/api/:splat 200

    # RSS Feed
    /rss.xml  /api/rss/{slug}  200
    /feed.xml /api/rss/{slug}  200
    """).strip() + "\n"

# ─── FUNCTIONS ──────────────────────────────────────────────────────────────
def functions_middleware(slug):
    return textwrap.dedent(f"""
    import {{ handleArticleRequest }} from "../../_shared/article-middleware.js";

    export async function onRequest(context) {{
      const {{ pathname }} = new URL(context.request.url);
      if (!pathname.startsWith("/articulo")) {{
        return await context.next();
      }}
      return handleArticleRequest(context, "{slug}");
    }}
    """).strip() + "\n"

def functions_articulo(slug):
    return textwrap.dedent(f"""
    import {{ handleArticleRequest }} from '../../../_shared/article-middleware.js';

    export async function onRequest(context) {{
      const {{ params }} = context;
      const slug = params.slug;
      const url = new URL(context.request.url);
      url.searchParams.set('slug', slug);
      const modifiedRequest = new Request(url, {{
        method: context.request.method,
        headers: context.request.headers,
        body: context.request.body
      }});
      const modifiedContext = {{ ...context, request: modifiedRequest }};
      return handleArticleRequest(modifiedContext, '{slug}');
    }}
    """).strip() + "\n"

# ─── _SHARED/ARTICLE-MIDDLEWARE.JS ──────────────────────────────────────────
def shared_article_middleware():
    """Copia de cms-nuevos3/sites/_shared/article-middleware.js con WORKER_URL actualizado."""
    src = os.path.join(os.path.dirname(TEMPLATE), "_shared", "article-middleware.js")
    if not os.path.exists(src):
        return None
    with open(src) as f:
        content = f.read()
    return content.replace(
        "https://cms-nuevos3.sebastianvernis.workers.dev",
        WORKER_URL
    )

# ─── SAMPLE STATIC FILES (acerca-de, contacto, etc.) ────────────────────────
def simple_page(slug, title, content):
    return textwrap.dedent(f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="utf-8"/>
        <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
        <title>{title} - {slug}</title>
        <link href="https://fonts.googleapis.com" rel="preconnect"/>
        <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
        <link href="style.css" rel="stylesheet" media="print" onload="this.media='all'"/>
        <link href="style-custom.css" rel="stylesheet" media="print" onload="this.media='all'"/>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" media="print" onload="this.media='all'"/>
    </head>
    <body>
        <div id="site-preloader"><div class="loader"></div></div>
        <div id="site-header"></div>
        <main class="legal-page">
            <h1>{title}</h1>
            <div class="legal-content">{content}</div>
        </main>
        <div id="site-footer"></div>
        <script src="pwa-manager.js" defer></script>
        <script src="script.js" defer></script>
        <script src="components.js" defer></script>
    </body>
    </html>
    """).strip() + "\n"

# ─── SCAFFOLD PRINCIPAL ─────────────────────────────────────────────────────
def scaffold_site(site):
    slug = site["slug"]
    nombre = site["nombre"]
    tagline = site.get("tagline", "")
    theme = site["tema"]
    posture = POSTURE.get(slug, "magazine")
    fonts = FONT_MAP.get(slug, ("Inter", "Inter"))

    out_dir = os.path.join(OUT_ROOT, slug)
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(SHARED_OUT, exist_ok=True)  # también crear _shared/
    os.makedirs(os.path.join(out_dir, "categoria"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "articulo"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "functions", "articulo"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "admin"), exist_ok=True)

    # Copia de archivos idénticos (style.css, script.js, sw.js, robots.txt, pwa-manager.js)
    for fname in ["style.css", "script.js", "sw.js", "robots.txt", "pwa-manager.js", "manifest.json"]:
        src = os.path.join(TEMPLATE, fname)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(out_dir, fname))

    # style-custom.css, components.js, index.html, wrangler.toml, _redirects
    with open(os.path.join(out_dir, "style-custom.css"), "w") as f:
        f.write(css_for_site(slug, nombre, theme, posture, fonts))
    with open(os.path.join(out_dir, "components.js"), "w") as f:
        f.write(components_js(slug, nombre, posture, theme))
    with open(os.path.join(out_dir, "index.html"), "w") as f:
        f.write(index_html(slug, nombre, theme, tagline))
    with open(os.path.join(out_dir, "wrangler.toml"), "w") as f:
        f.write(wrangler_toml(slug))
    with open(os.path.join(out_dir, "_redirects"), "w") as f:
        f.write(redirects(slug))

    # Functions
    with open(os.path.join(out_dir, "functions", "_middleware.js"), "w") as f:
        f.write(functions_middleware(slug))
    with open(os.path.join(out_dir, "functions", "articulo", "[slug].js"), "w") as f:
        f.write(functions_articulo(slug))

    # Logo placeholders (4 variantes)
    primary   = theme["color_primario"]
    secondary = theme["color_secundario"]
    render_logo(os.path.join(out_dir, "logo.png"),        slug, nombre, primary, secondary, "main")
    render_logo(os.path.join(out_dir, "logo-header.png"), slug, nombre, primary, secondary, "header")
    render_logo(os.path.join(out_dir, "logo-footer.png"), slug, nombre, primary, secondary, "footer")
    render_logo(os.path.join(out_dir, "favicon.png"),     slug, nombre, primary, secondary, "favicon")

    # Logo en _shared/ también
    render_logo(os.path.join(SHARED_OUT, f"{slug}.png"), slug, nombre, primary, secondary, "header")

    # Páginas estáticas simples
    about = f"<p>{nombre} es un medio de comunicación digital que cubre la actualidad mexicana con perspectiva editorial {posture}.</p><p>Tagline: <em>{tagline}</em></p>"
    with open(os.path.join(out_dir, "acerca-de.html"), "w") as f:
        f.write(simple_page(slug, "Acerca de", about))
    with open(os.path.join(out_dir, "contacto.html"), "w") as f:
        f.write(simple_page(slug, "Contacto", "<p>Contacto: contacto@{slug}.com</p>".format(slug=slug)))
    with open(os.path.join(out_dir, "privacidad.html"), "w") as f:
        f.write(simple_page(slug, "Privacidad", "<p>Política de privacidad de {nombre}.</p>".format(nombre=nombre)))
    with open(os.path.join(out_dir, "terminos.html"), "w") as f:
        f.write(simple_page(slug, "Términos", "<p>Términos y condiciones de {nombre}.</p>".format(nombre=nombre)))

    # Categoria y articulo: reusan el index.html con un placeholder
    with open(os.path.join(out_dir, "categoria", "index.html"), "w") as f:
        f.write(simple_page(slug, "Categoría", "<p>Categoría de {nombre}.</p>".format(nombre=nombre)))
    with open(os.path.join(out_dir, "articulo", "index.html"), "w") as f:
        f.write(simple_page(slug, "Artículo", "<p>Artículo de {nombre}.</p>".format(nombre=nombre)))

    return out_dir

# ─── MAIN ───────────────────────────────────────────────────────────────────
def main():
    os.makedirs(OUT_ROOT, exist_ok=True)
    os.makedirs(SHARED_OUT, exist_ok=True)

    # _shared/article-middleware.js
    mw = shared_article_middleware()
    if mw:
        with open(os.path.join(SHARED_OUT, "article-middleware.js"), "w") as f:
            f.write(mw)

    sites = []
    for f in sorted(glob.glob(os.path.join(DATA_DIR, "*.json"))):
        if "_schema" in f: continue
        with open(f) as fh:
            sites.append(json.load(fh))

    print(f"Scaffolding {len(sites)} sitios a {OUT_ROOT}")
    for s in sites:
        try:
            d = scaffold_site(s)
            print(f"  ✓ {s['slug']:30s}  {s['tema']['color_primario']}  postura={POSTURE.get(s['slug'], '?')}")
        except Exception as e:
            print(f"  ✗ {s['slug']:30s}  ERROR: {e}")
    print(f"\nListo. _shared/ en {SHARED_OUT}")

if __name__ == "__main__":
    main()
