# Deploy

## Prerrequisitos

1. **Cloudflare account** con Pages habilitado.
2. **Worker del CMS desplegado** y accesible vía `https://<host>/api/*`.
3. **D1 binding** ya creado en el CMS (el sitio no crea la DB).
4. **Wrangler CLI**: `npx wrangler --version` debe funcionar (Node 18+).
5. **Cuenta de Cloudflare autenticada**: `npx wrangler login` la primera vez.

## Flujo paso a paso

### 1. Crear/editar el config

```bash
cp _template-clean/site.config.example.json _template-clean/mi-sitio.json
$EDITOR _template-clean/mi-sitio.json
```

Campos críticos:

- `name` — slug del proyecto en Cloudflare Pages (debe coincidir con `--project-name`).
- `prefix` — único, 3-6 chars minúsculas. Sin él, los sitios del mismo dominio
  colisionan en clases CSS.
- `theme.primary/secondary/light/text` — colores. Verificar contraste WCAG AA
  para texto sobre fondo.
- `cms.host` — el host del CMS al que apunta el sitio.
- `deploy.projectName` — slug del proyecto en Cloudflare Pages (suele coincidir
  con `name`).

### 2. Generar el sitio

```bash
# Sanity check primero
node _template-clean/scripts/new-site.mjs \
  --config _template-clean/mi-sitio.json \
  --out    /tmp/_test \
  --dry-run

# Cuando se ve OK
node _template-clean/scripts/new-site.mjs \
  --config _template-clean/mi-sitio.json \
  --out    ../sites/mi-sitio
```

`out` debe apuntar a una carpeta **nueva** (el script falla si ya existe para
no pisar).

### 3. Agregar logos

Copiar en la raíz del sitio generado:

- `logo-header.png` — para el ticker (fondo blanco recomendado).
- `logo.png` — versión principal.
- `logo-footer.png` — versión para footer.
- `favicon.png` — 32×32 mínimo, ideal 192×192.

Recomendado: PNG con transparencia, no más de 200KB cada uno.

### 4. Sincronizar logo con el CMS (opcional)

Si el CMS usa el logo para OG tags de redes sociales, sincroniza:

```bash
cp ../sites/mi-sitio/logo-header.png ../cms-*/_shared/mi-sitio.png
```

La ruta exacta la imprime el script al final.

### 5. Crear proyecto en Cloudflare Pages (primera vez)

```bash
cd ../sites/mi-sitio
npx wrangler pages deploy . --project-name=mi-sitio --branch=master
```

La primera vez Wrangler crea el proyecto. Las siguientes detecta el existente.

### 6. Verificación post-deploy

```bash
# Homepage
curl -I https://mi-sitio.pages.dev/

# API proxy
curl https://mi-sitio.pages.dev/api/articles?site=mi-sitio\&limit=3 | jq '.articles | length'

# RSS
curl -I https://mi-sitio.pages.dev/rss.xml
```

Si la API devuelve 502/503, el proxy apunta a un CMS que no responde.
Verifica `cms.host` y que el worker del CMS esté vivo.

### 7. Custom domain (opcional)

Desde el dashboard de Cloudflare:

1. Pages → `mi-sitio` → Custom domains → `noticias.midominio.com`.
2. DNS: CNAME automático o registro `A`/`AAAA` para apex.

El sitio hereda el SSL del dominio.

## CI / batch deploys

Para deploys masivos (varios sitios a la vez), un loop bash:

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
CONFIGS=(
  "sitio-a.json"
  "sitio-b.json"
  "sitio-c.json"
)
for c in "${CONFIGS[@]}"; do
  name=$(jq -r '.name' "$ROOT/$c")
  echo "→ $name"
  node "$ROOT/scripts/new-site.mjs" \
    --config "$ROOT/$c" \
    --out    "$ROOT/../sites/$name"
  (cd "$ROOT/../sites/$name" && \
    npx wrangler pages deploy . --project-name="$name" --branch=master)
done
```

## Rollback

Cloudflare Pages guarda historial de deploys. Para revertir:

```bash
# Ver deployments
npx wrangler pages deployments list --project-name=mi-sitio

# Promover un deployment previo a producción
npx wrangler pages deployments promote <deployment-id> --project-name=mi-sitio
```

O desde el dashboard: Pages → `mi-sitio` → Deployments → ⋯ → Rollback.
