# REPORTE DE ANÁLISIS - FLUJO DE PUBLICACIÓN AUTOMÁTICA

**Fecha:** 27 de Marzo de 2026  
**Hora:** 09:40 UTC  
**Analista:** AI Orchestrator

---

## RESUMEN EJECUTIVO

| Aspecto | Estado | Observación |
|---------|--------|-------------|
| **Cron Jobs** | ✅ Funcionando | Se ejecutan cada 30 min |
| **Ingesta RSS** | ⚠️ 0 artículos | No hay artículos nuevos |
| **Cola Facebook** | ⚠️ 100 pendientes | 0 publicados en 3 días |
| **Timers FB** | ❓ Sin verificar | Posible problema |

---

## PROBLEMAS IDENTIFICADOS

### 1. ⚠️ INVERSIÓN CRÍTICA: No hay ingesta de artículos nuevos

**Síntoma:**
- Cron Status: `ingest: "OK (0 articles)"` 
- Último artículo: **26 de Marzo 2026** (hace ~21 horas)
- Sin artículos del 27 de Marzo

**Fuentes RSS verificadas:**
| Fuente | Estado | Content-Type |
|---------|--------|-------------|
| jornada.com.mx | ✅ 200 OK | text/xml |
| proceso.com.mx | ✅ 200 OK | application/xml |
| aristeguinoticias.com | ⚠️ 200 OK | **text/html** (debería ser XML) |
| expansion.mx | No verificada | - |
| reforma.com | No verificada | - |

**Causa probable:**
- Aristegui News retorna HTML en lugar de XML (posible bloqueo o cambio de API)
- Las demás fuentes pueden tener contenido duplicado o ser filtradas

**Recomendación:**
1. Verificar logs del Worker: `wrangler tail --name cms-originaux`
2. Revisar si las fuentes RSS requieren User-Agent diferente
3. Considerar agregar fuentes RSS alternativas

---

### 2. ❓ FACEBOOK: 100 artículos pendientes, 0 publicados

**Síntoma:**
- Monitor Facebook muestra 100 artículos pendientes (10 por sitio)
- Cron FB reporta: `fb: "OK (0/10)"` 
- Todos los artículos tienen `fb_published: false`
- Artículos más antiguos: **24 de Marzo 2026** (3 días sin publicar)

**Distribución por sitio (CMS Originaux):**
| Sitio | Pendientes |
|-------|-----------|
| bitacoraurbana | 11 |
| cbnnoticias | 10 |
| centralmexico | 10 |
| mexicoinformado | 10 |
| nodoinformativo | 10 |
| noticiasObjetivo | 9 |
| radiocinconoticias | 10 |
| reportecentralmx | 10 |
| tvmexico | 10 |
| verticenoticias | 10 |

**Causas posibles:**

#### Opción A: Timers activos (4 horas)
El cron de Facebook tiene un timer de 4 horas entre publicaciones por sitio. Si los timers están activos, no publica aunque haya artículos pendientes.

**Verificación local:**
```bash
# Ver timers en KV
wrangler kv:key list --binding ARTICLES_KV --namespace-id e6ceb0a1487d425f9c3dc69e3fed9145 | grep last_fb_post
```

#### Opción B: Tablas SITIO vacías o desincronizadas
El cron busca en `ARTICULOS_SITIO_${SITIO}` pero el monitor muestra datos de `PUBLICACIONES_FB` (o similar). Puede haber desincronización.

#### Opción C: Error en tokens de Facebook
Los tokens de Facebook pueden estar inválidos o expirados.

**Verificación con AUTH:**
```bash
curl -s -H "Authorization: Bearer [ADMIN_TOKEN]" \
  https://cms-originaux.sebastianvernis.workers.dev/api/facebook/debug-tokens
```

---

### 3. 🔍 POSIBLE BUG: Case-sensitivity en nombres de tablas

**Código en `facebook.js`:**
```javascript
const tableName = `ARTICULOS_SITIO_${siteSlug.toUpperCase()}`;
```

**SITIOS_LIST:**
```javascript
const SITIOS_LIST = [
  'bitacoraurbana', 'cbnnoticias', 'centralmexico', 'mexicoinformado',
  'nodoinformativo', 'noticiasObjetivo',  // ← "Objetivo" con O mayúscula
  'radiocinconoticias', 'reportecentralmx', 'tvmexico', 'verticenoticias',
];
```

**Nombres de tablas en schema.sql:**
```sql
CREATE TABLE ARTICULOS_SITIO_NOTICIASOBJETIVO (  -- ← "Objetivo" con O mayúscula
```

**Problema:**
- `siteSlug.toUpperCase()` → `'NOTICIASOBJETIVO'` (todo mayúsculas)
- Tabla real: `ARTICULOS_SITIO_NOTICIASOBJETIVO` (solo primera letra mayúscula)

**D1 es case-insensitive**, pero el código JavaScript sugiere inconsistencia.

---

## ARQUITECTURA DEL FLUJO

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRON (cada 30 min)                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                            ▼
┌─────────────────┐        ┌─────────────────┐
│  RSS INGEST      │        │  FB TIMER       │
│  (runRSSIngest) │        │  (processFBTimer)│
└────────┬────────┘        └────────┬────────┘
         │                            │
         ▼                            ▼
┌─────────────────┐        ┌─────────────────┐
│ ARTICULOS_      │        │ ARTICULOS_SITIO │
│ PARAFRASEADOS   │        │ _[SITIO]        │
│ (artículos)     │        │ (por sitio)      │
└─────────────────┘        └────────┬────────┘
                                    │
                                    ▼
                         ┌─────────────────┐
                         │ Facebook API    │
                         │ (Graph API v19) │
                         └─────────────────┘
```

---

## DATOS ACTUALES

### CMS Originaux
- **Worker:** cms-originaux
- **D1:** news_db_cms_originaux
- **KV:** e6ceb0a1487d425f9c3dc69e3fed9145
- **Sitios:** 10
- **Última ingesta:** 26 Mar 2026 (~21 horas)
- **Artículos en DB:** 20
- **Pendientes FB:** 100

### CMS Nuevos
- **Worker:** cms-nuevos  
- **D1:** news_db_cms_nuevos
- **Sitios:** 17
- **Pendientes FB:** 100

### CMS Nuevos 2
- **Worker:** cms-nuevos2
- **D1:** news_db_cms_nuevos2
- **Sitios:** 8
- **Pendientes FB:** 100

---

## RECOMENDACIONES DE ACCIÓN

### 1. Verificar logs del Worker
```bash
wrangler tail --name cms-originaux
wrangler tail --name cms-nuevos
wrangler tail --name cms-nuevos2
```

### 2. Resetear timers de Facebook (si están activos)
```bash
cd cms-originaux/scripts
node reset_fb_timers.js
```

### 3. Forzar ingesta manual
```bash
curl -X POST -H "Authorization: Bearer [TOKEN]" \
  https://cms-originaux.sebastianvernis.workers.dev/api/cron/ingest?force=true
```

### 4. Verificar tokens de Facebook
```bash
curl -s -H "Authorization: Bearer [TOKEN]" \
  https://cms-originaux.sebastianvernis.workers.dev/api/facebook/debug-tokens
```

### 5. Revisar fuentes RSS alternativas
Considerar agregar:
- https://www.jornada.com.mx/rss/sitemap.xml
- https://www.eluniversal.com.mx/rss/sociedad.xml
- https://www.milenio.com/rss

---

## COMANDOS PARA DIAGNÓSTICO

```bash
# 1. Ver estado completo del cron
curl -s https://cms-originaux.sebastianvernis.workers.dev/api/cron/status | jq

# 2. Ver cola de Facebook
curl -s https://cms-originaux.sebastianvernis.workers.dev/api/facebook/monitor | jq 'length'

# 3. Ver últimas publicaciones
curl -s "https://cms-originaux.sebastianvernis.workers.dev/api/articles?limit=5" | jq '.articles[] | {title, publishedAt, fb_published}'

# 4. Ver logs en vivo
wrangler tail --name cms-originaux --format pretty

# 5. Ver timers KV
wrangler kv:key list --binding ARTICLES_KV --namespace-id e6ceb0a1487d425f9c3dc69e3fed9145 | grep last_fb_post
```

---

*Reporte generado automáticamente - NexoPress Network*
