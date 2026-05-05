# CMS Nuevos 3 — Setup Summary

## ✅ COMPLETADO

### 1. Backend Worker (Cloudflare Workers)
- ✅ Directorio `cms-nuevos3/` creado (copia de cms-nuevos)
- ✅ `src/config.js` actualizado con 24 sitios (basado en comprobantes de pago)
- ✅ `wrangler.toml` configurado (falta IDs de D1/KV)
- ✅ Migraciones SQL copiadas (`migrations/000, 001, 002`)

### 2. Sitios (Cloudflare Pages)
- ✅ 24 directorios creados en `cms-nuevos3/sites/`
- ✅ Cada sitio tiene estructura base (`wrangler.toml`, `admin/`)

### 3. Diseño (Stitch)
- ✅ Proyecto Stitch mapeado: 13 diseños → 24 sitios
- ✅ Cada sitio asignado a un diseño (algunos comparten)

---

## 📋 PRÓXIMOS PASOS (Necesita ejecución manual)

### PASO 1: Crear recursos en Cloudflare (en terminal)
```bash
cd /home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-nuevos3

# Crear D1 database
npx wrangler d1 create news_db_cms_nuevos3
# → Guardar el ID devuelto

# Crear KV namespace
npx wrangler kv namespace create ARTICLES_KV --preview false
# → Guardar el ID devuelto
```

### PASO 2: Actualizar IDs en wrangler.toml
```bash
# Editar cms-nuevos3/wrangler.toml:
# - Reemplazar TODO_REPLACE_WITH_NEW_D1_ID con el ID devuelto
# - Reemplazar TODO_REPLACE_WITH_NEW_KV_ID con el ID devuelto
```

### PASO 3: Ejecutar migraciones
```bash
cd cms-nuevos3

npx wrangler d1 execute news_db_cms_nuevos3 \
  --file=migrations/000_init_tables.sql --remote
  
npx wrangler d1 execute news_db_cms_nuevos3 \
  --file=migrations/001_create_fuentes_table.sql --remote
  
npx wrangler d1 execute news_db_cms_nuevos3 \
  --file=migrations/002_add_fb_token_column.sql --remote
```

### PASO 4: Desplegar worker
```bash
npx wrangler deploy
```

### PASO 5: Personalizar y desplegar sitios (Cloudflare Pages)
Para cada sitio en `cms-nuevos3/sites/<slug>/`:

1. Exportar HTML/CSS desde Stitch (según mapeo en abajo)
2. Colocar en `sites/<slug>/index.html` y assets
3. Personalizar nombre/dominio en HTML
4. Desplegar: `npx wrangler pages deploy sites/<slug>`

---

## 🎨 MAPEO: STITCH DESIGNS → CMS NUEVOS 3 SITES

| Sitio | Slug | Diseño Stitch | Dominio |
|-------|------|---------------|---------|
| Actualidad Sin Fronteras | actualidadsinfronteras | The Architect | actualidadsinfronteras.click |
| ADN Mexicano | adnmexicano | Neo-Focus | adnmexicano.online |
| Azteca México Noticias | aztecamexiconoticias | Heritage | aztecamexiconoticias.top |
| Diario Mexicano | diariomexicano | Chronicle News | diariomexicano.click |
| Diario México | diariomexico | The Vanguard | diariomexico.online |
| El Análisis Mexicano | elanalisismexicano | The Observer | elanalisismexicano.top |
| El Observador Republicano | elobservadorrepublicano | Global Pulse | elobservadorrepublicano.click |
| El Profeta Mexicano | elprofetamexicano | The Continental | elprofetamexicano.lat |
| Enfoque Mexicano | enfoquemexicano | Nova News | enfoquemexicano.click |
| Expreso Mexicano | expresomexicano | The Daily Ledger | expresomexicano.top |
| Finance Markets MX | financemarketsmx | The Metropolitan | financemarketsmx.top |
| Mexican News of the World | mexicannewsoftheworld | Aura | mexicannewsoftheworld.top |
| Mexico and the World | mexicoandtheworld | The Architect | mexicoandtheworld.click |
| México Daily | mexicodaily | Chronicle News | mexicodaily.top |
| México en Resumen | mexicoenresumen | Neo-Focus | mexicoenresumen.click |
| México Plus | mexicoplus | Heritage | mexicoplus.click |
| Monitor Republicano | monitorrepublicano | Global Pulse | monitorrepublicano.top |
| Nacional al Instante | nacionalinstante | The Vanguard | nacionalinstante.top |
| Noticias al Instante | noticiasalinstante | Nova News | noticiasalinstante.click |
| Perspectiva Mexicana | perspectivamexicana | The Observer | perspectivamexicana.click |
| Política Salvaje al Minuto | politicasalvajealminuto | The Continental | politicasalvajealminuto.click |
| Pulso Republicano Noticias | pulsorepublicanonoticias | The Daily Ledger | pulsorepublicanonoticias.top |
| Radio Red MX | radioredmx | The Metropolitan | radioredmx.top |
| República MX | republicamx | Aura | republicamx.lat |

---

## 📁 ESTRUCTURA FINAL

```
cms-nuevos3/
├── wrangler.toml              ← Actualizar con IDs
├── package.json
├── src/
│   ├── config.js              ✅ (24 sitios)
│   ├── index.js
│   ├── routes/
│   ├── cron/
│   └── utils/
├── migrations/                ✅ (000, 001, 002)
└── sites/
    ├── actualidadsinfronteras/
    ├── adnmexicano/
    ├── ... (24 sitios)
    └── _shared/
```

---

## 🔑 SECRETS REQUIRED

Después de desplegar, añadir estos secrets al worker:
```bash
npx wrangler secret put FB_APP_ID
npx wrangler secret put FB_APP_SECRET
```

---

## ✨ STATUS

**Backend:** 95% (falta crear D1/KV en Cloudflare)
**Frontend:** 30% (falta exportar/personalizar desde Stitch)
**Total:** ~60% (listo para deploy, pero requiere pasos manuales)
