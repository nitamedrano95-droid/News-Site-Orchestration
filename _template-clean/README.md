# _template-clean

Plantilla limpia y generador para sitios de noticias del **News Site Orchestration**.
Genera un sitio completo (HTML estático + Cloudflare Pages Functions) a partir de un
`site.config.json` y la carpeta `template/`.

Esta plantilla **no incluye** los archivos legacy que estaban en `_template/`:

| Excluido | Por qué |
|---|---|
| `index-unified.html` | Variante abandonada; `index.html` actual usa `masonry-wall`. |
| `unified-index.js` | Lógica de la variante abandonada. |
| `distribution_block.js` | Módulo de n8n, no del template de sitio. Va en `cms-nuevos3/_shared/` u otro worker. |
| `admin/` | Carpeta vacía. |
| `.od-skills/`, `.git/` | Metadata local. |

---

## TL;DR — generar un sitio nuevo

```bash
# 1. Crear config del sitio (copia el ejemplo y edita)
cp site.config.example.json mi-sitio.json

# 2. Generar el sitio (dry run primero)
node scripts/new-site.mjs --config ./mi-sitio.json --out ../../sites/mi-sitio --dry-run
node scripts/new-site.mjs --config ./mi-sitio.json --out ../../sites/mi-sitio

# 3. Agregar logos en el directorio generado
cp tu-logo.png       ../../sites/mi-sitio/logo-header.png
cp tu-logo-dark.png  ../../sites/mi-sitio/logo.png
cp tu-logo-foot.png  ../../sites/mi-sitio/logo-footer.png
cp tu-favicon.png    ../../sites/mi-sitio/favicon.png

# 4. (Opcional) Sincronizar el logo con el CMS
cp ../../sites/mi-sitio/logo-header.png ../../_shared/mi-sitio.png

# 5. Desplegar
cd ../../sites/mi-sitio
npx wrangler pages deploy . --project-name=mi-sitio --branch=master
```

---

## Estructura del repositorio

```
_template-clean/
├── README.md                    ← este archivo
├── site.config.example.json     ← ejemplo de config (copia y edita)
├── site.config.schema.json      ← JSON Schema (validación)
├── package.json
├── template/                    ← HTML/CSS/JS del sitio, con 7 placeholders literales
│   ├── index.html
│   ├── articulo/index.html
│   ├── categoria/index.html
│   ├── acerca-de.html  contacto.html  privacidad.html  terminos.html
│   ├── style.css  style-custom.css  article.css  legal.css
│   ├── components.js  script.js  sw.js
│   ├── wrangler.toml
│   ├── _redirects
│   ├── robots.txt
│   └── functions/
│       ├── _middleware.js
│       └── articulo/[slug].js
├── scripts/
│   └── new-site.mjs             ← generador
├── docs/                        ← guías detalladas
│   ├── STRUCTURE.md
│   ├── PLACEHOLDERS.md
│   ├── CUSTOMIZE.md
│   ├── DEPLOY.md
│   └── TROUBLESHOOTING.md
└── assets/                      ← recursos estáticos auxiliares
    └── README.md
```

---

## Documentación

- **[docs/STRUCTURE.md](docs/STRUCTURE.md)** — qué hace cada archivo del template
- **[docs/PLACEHOLDERS.md](docs/PLACEHOLDERS.md)** — los 7 placeholders literales y dónde aparecen
- **[docs/CUSTOMIZE.md](docs/CUSTOMIZE.md)** — qué se puede tocar sin romper el contrato
- **[docs/DEPLOY.md](docs/DEPLOY.md)** — pipeline de deploy + prerrequisitos
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** — bugs conocidos y fixes

---

## Convenciones de versionado

- `template/` solo cambia cuando cambia el contrato con el CMS.
- `scripts/new-site.mjs` cambia cuando cambian los placeholders o el schema.
- Sitios generados (`../../sites/*`) no son parte de este repositorio — cada uno
  tiene su propio deploy en Cloudflare Pages.
