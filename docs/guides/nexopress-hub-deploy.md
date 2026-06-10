# NexoPress Hub — Guía de Deploy

> **Para el usuario:** Seguí estos pasos en orden. Todo es manual — no hay auto-deploy.

## 1. Crear recursos en Cloudflare

### D1 Database (Hub)

```bash
wrangler d1 create nexopress-hub-db
```

Anotá el `database_id` del output.

### KV Namespace (Sesiones)

```bash
wrangler kv:namespace create HUB_KV
```

Anotá el `id` del output.

### KV Namespace (para caché de validación Hub en los CMSs)

```bash
wrangler kv:namespace create HUB_VALIDATION_CACHE
```

Anotá el `id`.

## 2. Configurar el Worker del Hub

Editá `nexopress-hub/wrangler.toml` y reemplazá los placeholders:

```toml
[[d1_databases]]
binding = "HUB_DB"
database_name = "nexopress-hub-db"
database_id = "<PEGA_ACÁ_EL_DATABASE_ID>"

[[kv_namespaces]]
binding = "HUB_KV"
id = "<PEGA_ACÁ_EL_ID_DE_HUB_KV>"
```

## 3. Deployar el Worker del Hub

```bash
cd nexopress-hub
wrangler deploy
```

El output te va a dar la URL del Worker, algo como:
`https://nexopress-hub.sebastianvernis.workers.dev`

## 4. Migrar la DB del Hub

```bash
wrangler d1 execute nexopress-hub-db --file migrations/001_init.sql
```

Esto crea las tablas `HUB_USERS`, `HUB_SESSIONS`, `HUB_AUDIT_LOG` y seedea tu usuario (sebastianvernis@gmail.com) como admin.

## 5. Configurar los 5 CMSs

En cada uno de los 5 CMSs (`cms-originaux`, `cms-nuevos`, `cms-nuevos2`, `cms-nuevos3`, `cms-nuevos4`):

### a) Editar wrangler.toml

Agregar/verificar:

```toml
[[kv_namespaces]]
binding = "HUB_VALIDATION_CACHE"
id = "<PEGA_ACÁ_EL_ID_DE_HUB_VALIDATION_CACHE>"

[vars]
HUB_API_URL = "https://nexopress-hub.sebastianvernis.workers.dev"
```

### b) Migrar la DB

```bash
cd cms-nuevos4  # o el que estés configurando
wrangler d1 execute <DATABASE_NAME_DEL_CMS> --file migrations/002_seo_fields.sql
wrangler d1 execute <DATABASE_NAME_DEL_CMS> --file migrations/003_seed_rodrigo.sql
```

Repetir para los 5 CMSs.

## 6. Deployar el Frontend (Pages)

```bash
cd nexopress-hub-ui
npm install
npm run build
wrangler pages deploy dist --project-name=nexopress-hub-ui
```

Esto deploya a `https://nexopress-hub-ui.pages.dev`.

### Opcional: Custom domain

Si querés `hub.sebastianvernis.space`:

```bash
wrangler pages project update nexopress-hub-ui --production-branch=main
# Después en Cloudflare Dashboard > Pages > nexopress-hub-ui > Custom domains > Add custom domain
```

## 7. Configurar URLs en el frontend

Si usás un custom domain, editá `nexopress-hub-ui/src/main.jsx` y cambiá:

```jsx
const API_BASE = 'https://nexopress-hub.sebastianvernis.workers.dev'
```

O creá `.env`:

```
VITE_API_BASE=https://nexopress-hub.sebastianvernis.workers.dev
```

Y rebuild:

```bash
npm run build
wrangler pages deploy dist --project-name=nexopress-hub-ui
```

## 8. Testear

1. Entrá a `https://nexopress-hub-ui.pages.dev/login` (o tu custom domain)
2. Logueate con:
   - Email: `sebastianvernis@gmail.com`
   - Password: la que hayas seteado vía setup-password token
3. Deberías ver el Dashboard con los 5 CMSs
4. Click en "Nuevo Artículo" en cualquier CMS
5. Escribí un artículo, completá el panel SEO, guardá

## 9. Setup de Rodrigo

Para que Rodrigo pueda entrar:

1. Entrá al Hub (o directamente a un CMS)
2. Andá al panel Users
3. Click "Generar Link" al lado de Rodrigo
4. Ese link se lo manda por email/WhatsApp
5. Rodrigo entra, setea su password, y ya puede loguearse

## Troubleshooting

### Error: "Unauthorized" en el Dashboard

- Verificá que el token en `localStorage` sea válido
- Revisá los logs del Worker: `wrangler tail --name nexopress-hub`

### Error: "Failed to fetch CMS stats"

- Verificá que `HUB_API_URL` esté configurado en los wrangler.toml de los CMSs
- Verificá que los CMSs estén deployados y accesibles

### Error: "Database not found"

- Verificá que el `database_id` en `wrangler.toml` sea correcto
- Verificá que hayas corrido las migraciones

### El SEO panel no muestra análisis

- Verificá que `src/utils/seo.js` exista en el CMS
- Verificá que el endpoint `/articles/:id/seo` esté respondiendo

## URLs de referencia

| Componente | URL |
|------------|-----|
| Hub Worker | `https://nexopress-hub.sebastianvernis.workers.dev` |
| Hub UI (prod) | `https://nexopress-hub-ui.pages.dev` |
| Hub UI (custom) | `https://hub.sebastianvernis.space` |
| CMS-originaux | `https://cms-originaux.sebastianvernis.workers.dev` |
| CMS-nuevos | `https://cms-nuevos.sebastianvernis.workers.dev` |
| CMS-nuevos2 | `https://cms-nuevos2.sebastianvernis.workers.dev` |
| CMS-nuevos3 | `https://cms-nuevos3.sebastianvernis.workers.dev` |
| CMS-nuevos4 | `https://cms-nuevos4.sebastianvernis.workers.dev` |

## Próximos pasos (post-deploy)

1. **Sitemap XML** — el endpoint `/sitemap.xml` del Hub ya está implementado, solo hay que exponerlo en cada sitio
2. **State machine** — los endpoints `/articles/:id/state` están listos, falta UI en el Dashboard para ver el workflow
3. **Audit log** — el Hub guarda logs en `HUB_AUDIT_LOG`, falta UI para verlos
4. **Notificaciones** — webhook a n8n cuando un artículo cambia de estado
