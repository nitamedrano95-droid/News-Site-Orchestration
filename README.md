# NexoPress - Sistema de Noticias Multi-Sitio (Cloudflare)

NexoPress es una plataforma de noticias de alto rendimiento diseñada íntegramente para el ecosistema de **Cloudflare**. Gestiona **60 sitios de noticias independientes** distribuidos en **4 paneles CMS** y un núcleo centralizado en Cloudflare Workers y D1.

**Portal de Administración:** https://nexopress.sebastianvernis.space

## 🚀 Arquitectura del Sistema

El proyecto se basa en una arquitectura de **Worker Unificado** que gestiona tanto la API como las tareas programadas (Cron Jobs).

- **Frontend:** 60 sitios estáticos en Cloudflare Pages (10 originaux + 17 nuevos + 8 nuevos 2 + 25 nuevos 3)
- **Backend (API):** 3 Cloudflare Workers independientes (Hono framework)
- **Base de Datos:** Cloudflare D1 (SQLite) — una DB por CMS
- **Almacenamiento:** Cloudflare R2 (Imágenes) y KV (Caché/Estado)
- **IA:** Integración con OpenRouter (Gemini 2.0 Flash) para corrección de estilo y parafraseo
- **Portal:** NexoPress Portal — punto de entrada unificado a los 4 CMS

## ✨ Características Principales

- **Ingesta Multi-Formato:** Soporte para RSS y Atom (El País, Proceso, Aristegui, etc.)
- **Parafraseo con IA:** Corrección automática de ortografía y gramática mediante IA
- **Flujo de Facebook Inteligente:**
  - Publicación automática cada 3 horas por sitio
  - Filtro de **"Imagen Perfecta"**: Solo publica en Facebook si el artículo tiene una imagen original (evita imágenes de relleno)
  - Tokens de página permanentes (Never Expire)
  - Soporte para 60 sitios independientes
- **4 Dashboards Administrativos (CMS):**
  - **CMS Originaux** (10 sitios) — Sistema principal
  - **CMS Nuevos** (17 sitios) — Segunda generación
  - **CMS Nuevos 2** (8 sitios) — Tercera generación
  - **CMS Nuevos 3** (25 sitios) — Cuarta generación
  - Cada CMS con: Monitor de Sistema, Editor universal, Mesa de revisión, Ingesta manual
  - Portal NexoPress como punto de acceso unificado

## 🌐 Red de Sitios (60) — 4 CMS

### CMS Originaux (10 sitios) — Sistema Principal

| # | Sitio | Dominio | Slug |
|---|-------|---------|------|
| 1 | Radio Cinco Noticias | https://www.radiocinconoticias.click | `radiocinconoticias` |
| 2 | Central México | https://www.centralmexico.online | `centralmexico` |
| 3 | TV México | https://www.tvmexiconews.site | `tvmexico` |
| 4 | CBN Noticias | https://www.cbnnoticias.click | `cbnnoticias` |
| 5 | México Informado | https://www.mexicoinformado.lat | `mexicoinformado` |
| 6 | Nodo Informativo | https://www.nodoinformativo.lat | `nodoinformativo` |
| 7 | Bitácora Urbana | https://www.bitacoraurbana.lat | `bitacoraurbana` |
| 8 | Reporte Central MX | https://www.reportecentral.site | `reportecentralmx` |
| 9 | Vértice Noticias | https://www.verticenoticias.today | `verticenoticias` |
| 10 | Noticias Objetivo | https://www.noticiasobjetivo.click | `noticiasobjetivo` |

### CMS Nuevos (17 sitios) — Segunda Generación

| # | Sitio | Dominio | Slug |
|---|-------|---------|------|
| 11 | Boominformativo | https://www.boominformativo.site | `boominformativo` |
| 12 | Capital Press | https://www.capitalpress.mx | `capitalpress` |
| 13 | Diario Express | https://www.diarioexpress.news | `diarioexpress` |
| 14 | El Pulso Mexicano | https://www.elpulsomexicano.com | `elpulsomexicano` |
| 15 | Enfoque Capital | https://www.enfoquecapital.mx | `enfoquecapital` |
| 16 | Enfoque Directo | https://www.enfoquedirecto.news | `enfoquedirecto` |
| 17 | Fórmula CDMX | https://www.formulacdmx.mx | `formulacdmx` |
| 18 | The Mexican Times | https://www.mexicantimes.mx | `mexicantimes` |
| 19 | México 360 Noticias | https://www.mexico360noticias.mx | `mexico360noticias` |
| 20 | M Radio | https://www.mradio.mx | `mradio` |
| 21 | Noticias Horizonte | https://www.noticiashorizonte.mx | `noticiashorizonte` |
| 22 | Pulso Diario | https://www.pulsodiario.mx | `pulsodiario` |
| 23 | Punto Clave | https://www.puntoclave.mx | `puntoclave` |
| 24 | Punto Noticias | https://www.puntonoticias.mx | `puntonoticias` |
| 25 | Radar Informativo | https://www.radarinformativo.mx | `radarinformativo` |
| 26 | Reporte Diario | https://www.reportediario.mx | `reportediario` |
| 27 | Televisión ABC | https://www.televisionabc.mx | `televisionabc` |

### CMS Nuevos 2 (8 sitios) — Tercera Generación

| # | Sitio | Dominio | Slug |
|---|-------|---------|------|
| 28 | Centro News | https://www.centronews.online | `centronews` |
| 29 | Noticias 123 | https://www.noticias123.online | `noticias123` |
| 30 | Breaking Center News México | https://www.breakingcentermexico.news | `breakingcentermexico` |
| 31 | A la Vista Noticias | https://www.alavistanoticias.news | `alavistanoticias` |
| 32 | Social Mexico News | https://www.socialmexiconews.news | `socialmexiconews` |
| 33 | TMZ News México | https://www.tmznews.mx | `tmznews` |
| 34 | Radio ABC | https://www.radioabc.mx | `radioabc` |
| 35 | Noticias Integra | https://www.noticiasintegra.news | `noticiasintegra` |

### CMS Nuevos 3 (25 sitios) — Cuarta Generación

| # | Sitio | Dominio | Slug |
|---|-------|---------|------|
| 36 | Enfoque Mexicano | https://www.enfoquemexicano.click | `enfoquemexicano` |
| 37 | ADN Mexicano | https://www.adnmexicano.online | `adnmexicano` |
| 38 | Pulso Republicano Noticias | https://www.pulsorepublicanonoticias.top | `pulsorepublicanonoticias` |
| 39 | Mexican News of the World | https://www.mexicannewsoftheworld.top | `mexicannewsoftheworld` |
| 40 | Expreso Mexicano | https://www.expresomexicano.top | `expresomexicano` |
| 41 | México Daily | https://www.mexicodaily.top | `mexicodaily` |
| 42 | Azteca México Noticias | https://www.aztecamexiconoticias.top | `aztecamexiconoticias` |
| 43 | El Análisis Mexicano | https://www.elanalisismexicano.top | `elanalisismexicano` |
| 44 | Nacional al Instante | https://www.nacionalinstante.top | `nacionalinstante` |
| 45 | Mexico and the World | https://www.mexicoandtheworld.click | `mexicoandtheworld` |
| 46 | Diario Mexicano | https://www.diariomexicano.click | `diariomexicano` |
| 47 | Política Salvaje al Minuto | https://www.politicasalvajealminuto.click | `politicasalvajealminuto` |
| 48 | El Observador Republicano | https://www.elobservadorrepublicano.click | `elobservadorrepublicano` |
| 49 | México Plus | https://www.mexicoplus.click | `mexicoplus` |
| 50 | Actualidad Sin Fronteras | https://www.actualidadsinfronteras.click | `actualidadsinfronteras` |
| 51 | Noticias al Instante | https://www.noticiasalinstante.click | `noticiasalinstante` |
| 52 | República MX | https://www.republicamx.lat | `republicamx` |
| 53 | Diario México | https://www.diariomexico.online | `diariomexico` |
| 54 | Finance Markets MX | https://www.financemarketsmx.top | `financemarketsmx` |
| 55 | Monitor Republicano | https://www.monitorrepublicano.top | `monitorrepublicano` |
| 56 | El Profeta Mexicano | https://www.elprofetamexicano.lat | `elprofetamexicano` |
| 57 | México en Resumen | https://www.mexicoenresumen.click | `mexicoenresumen` |
| 58 | Radio Red MX | https://www.radioredmx.top | `radioredmx` |
| 59 | Perspectiva Mexicana | https://www.perspectivamexicana.click | `perspectivamexicana` |
| 60 | We News Mexico | https://www.wenewsmexico.click | `wenewsmexico` |

## 📚 Documentación

Para una guía detallada sobre el funcionamiento del sistema, consulta:

| Documento | Descripción |
|-----------|-------------|
| [Índice Documental](./docs/INDEX.md) | Portal de toda la documentación |
| [Monitor de Sistema](./docs/SYSTEM_MONITOR.md) | Diagnóstico y monitoreo |
| [Referencia de API](./docs/API_REFERENCE.md) | Endpoints y autenticación |
| [Portal NexoPress](./nexopress-portal/README.md) | Portal de acceso a los 4 CMS |

## 🛠️ Estructura del Proyecto

```
cloudflare-news-project/
├── cms-originaux/              # CMS Principal (10 sitios)
│   ├── src/                   # Worker source (API + Cron + FB)
│   ├── sites/                  # 10 sitios Cloudflare Pages
│   ├── public/admin/           # Dashboard SPA
│   ├── scripts/                # Scripts de verificación y deployment
│   ├── tools/                  # Herramientas (news-publisher, etc.)
│   └── wrangler.toml          # Config: cms-originaux worker
├── cms-nuevos/                # CMS Segunda Generación (17 sitios)
│   ├── src/                   # Worker source
│   ├── sites/                 # 17 sitios Cloudflare Pages
│   ├── public/admin/          # Dashboard SPA
│   ├── scripts/               # Scripts
│   ├── tools/                 # Herramientas
│   └── wrangler.toml         # Config: cms-nuevos worker
├── cms-nuevos2/               # CMS Tercera Generación (8 sitios)
│   ├── src/                  # Worker source
│   ├── sites/                # 8 sitios Cloudflare Pages
│   ├── public/admin/         # Dashboard SPA
│   ├── scripts/              # Scripts
│   ├── tools/                # Herramientas
│   └── wrangler.toml        # Config: cms-nuevos2 worker
├── cms-nuevos3/               # CMS Cuarta Generación (25 sitios)
│   ├── src/                  # Worker source
│   ├── sites/                # 25 sitios Cloudflare Pages
│   ├── public/admin/         # Dashboard SPA
│   ├── scripts/              # Scripts
│   ├── tools/                # Herramientas
│   └── wrangler.toml        # Config: cms-nuevos3 worker
├── nexopress-portal/          # Portal de acceso unificado
└── docs/                      # Documentación técnica
```

## ⚙️ Configuración y Despliegue

### Workers Desplegados

| Worker | D1 Database | KV Namespace | R2 Bucket |
|--------|-------------|--------------|-----------|
| `cms-originaux` | `news_db_cms_originaux` | `e6ceb0a1487d425f9c3dc69e3fed9145` | `cms-news` |
| `cms-nuevos` | `news_db_cms_nuevos` | `c90aab3a89054141933a28d232e87b6c` | `cms-news` |
| `cms-nuevos2` | `news_db_cms_nuevos2` | `0d0be3689d2342db8ad2a70070e1ecb3` | `cms-news` |
| `cms-nuevos3` | `news_db_cms_nuevos3` | `fbf21fb75f5647a8966858d199b44e0b` | `cms-news` |

### Despliegue de Workers

**CMS Originaux:**
```bash
cd cms-originaux
wrangler deploy --config wrangler.toml
```

**CMS Nuevos:**
```bash
cd cms-nuevos
wrangler deploy --config wrangler.toml
```

**CMS Nuevos 2:**
```bash
cd cms-nuevos2
wrangler deploy --config wrangler.toml
```

**CMS Nuevos 3:**
```bash
cd cms-nuevos3
wrangler deploy --config wrangler.toml
```

### Despliegue de Sitios Pages

**CMS Originaux (10 sitios):**
```bash
cd cms-originaux/sites/[sitio]
wrangler pages deploy . --project-name=[sitio] --branch=master
```

**CMS Nuevos (17 sitios):**
```bash
cd cms-nuevos/sites/[sitio]
wrangler pages deploy . --project-name=[sitio] --branch=master
```

**CMS Nuevos 2 (8 sitios):**
```bash
cd cms-nuevos2/sites/[sitio]
wrangler pages deploy . --project-name=[sitio] --branch=master
```

**CMS Nuevos 3 (25 sitios):**
```bash
cd cms-nuevos3/sites/[sitio]
wrangler pages deploy . --project-name=[sitio] --branch=master
```

### Variables de Entorno Críticas (Secrets)

**Generales:**
- `OPENROUTER_API_KEY`: Para el parafraseo e ingesta con IA
- `ADMIN_TOKEN`: Token maestro para administración de los CMS

**Facebook Tokens por CMS:**

```bash
# CMS Originaux (10 sitios)
wrangler secret put FB_TOKEN_RADIOCINCONOTICIAS --name cms-originaux
wrangler secret put FB_TOKEN_CENTRALMEXICO --name cms-originaux
# ... (ver docs/FACEBOOK_TOKEN_SETUP.md para lista completa)

# CMS Nuevos (17 sitios)
wrangler secret put FB_TOKEN_BOOMINFORMATIVO --name cms-nuevos
wrangler secret put FB_TOKEN_CAPITALPRESS --name cms-nuevos
# ...

# CMS Nuevos 2 (8 sitios)
wrangler secret put FB_TOKEN_CENTRONEWS --name cms-nuevos2
wrangler secret put FB_TOKEN_NOTICIAS123 --name cms-nuevos2
# ...

# CMS Nuevos 3 (25 sitios)
wrangler secret put FB_TOKEN_ENFOQUEMEXICANO --name cms-nuevos3
wrangler secret put FB_TOKEN_ADNMEXICANO --name cms-nuevos3
# ...
# ...
```

## 📊 Monitoreo

El sistema incluye endpoints de diagnóstico protegidos:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/cron/status` | GET | Estado de las últimas tareas automáticas |
| `/api/facebook/monitor` | GET | Monitor de publicaciones en Facebook |
| `/api/facebook/debug-tokens` | GET | Verifica la validez de los tokens de Facebook |
| `/api/cron/ingest` | POST | Dispara una ingesta manual de noticias |
| `/api/cron/manual` | POST | Ejecuta el cron manualmente |

**URLs de Dashboard:**

| CMS | URL del CMS | Worker |
|-----|-------------|--------|
| **Portal NexoPress** | https://nexopress.sebastianvernis.space | - |
| **CMS Originaux** | https://cms-originaux.sebastianvernis.workers.dev/admin/ | `cms-originaux` |
| **CMS Nuevos** | https://cms-nuevos.sebastianvernis.workers.dev/admin/ | `cms-nuevos` |
| **CMS Nuevos 2** | https://cms-nuevos2.sebastianvernis.workers.dev/admin/ | `cms-nuevos2` |
| **CMS Nuevos 3** | https://cms-nuevos3.sebastianvernis.workers.dev/admin/ | `cms-nuevos3` |

## 🔧 Comandos Útiles

### Desarrollo Local
```bash
# Worker CMS Originaux en local
cd cms-originaux && wrangler dev --config wrangler.toml

# Worker CMS Nuevos en local
cd cms-nuevos && wrangler dev --config wrangler.toml

# Worker CMS Nuevos 2 en local
cd cms-nuevos2 && wrangler dev --config wrangler.toml

# Worker CMS Nuevos 3 en local
cd cms-nuevos3 && wrangler dev --config wrangler.toml
```

### Producción
```bash
# Deploy CMS Originaux
cd cms-originaux && wrangler deploy --config wrangler.toml

# Deploy CMS Nuevos
cd cms-nuevos && wrangler deploy --config wrangler.toml

# Deploy CMS Nuevos 2
cd cms-nuevos2 && wrangler deploy --config wrangler.toml

# Deploy CMS Nuevos 3
cd cms-nuevos3 && wrangler deploy --config wrangler.toml

# Ver logs en vivo
wrangler tail --name cms-originaux
wrangler tail --name cms-nuevos
wrangler tail --name cms-nuevos2
wrangler tail --name cms-nuevos3
```

### Base de Datos
```bash
# CMS Originaux
wrangler d1 execute news_db_cms_originaux --command "SELECT COUNT(*) FROM ARTICULOS_PARAFRASEADOS" --remote

# CMS Nuevos
wrangler d1 execute news_db_cms_nuevos --command "SELECT COUNT(*) FROM ARTICULOS_PARAFRASEADOS" --remote

# CMS Nuevos 2
wrangler d1 execute news_db_cms_nuevos2 --command "SELECT COUNT(*) FROM ARTICULOS_PARAFRASEADOS" --remote

# CMS Nuevos 3
wrangler d1 execute news_db_cms_nuevos3 --command "SELECT COUNT(*) FROM ARTICULOS_PARAFRASEADOS" --remote
```

### Verificación
```bash
# Ver estado del cron CMS Originaux
curl -s https://cms-originaux.sebastianvernis.workers.dev/api/cron/status

# Ver estado del cron CMS Nuevos
curl -s https://cms-nuevos.sebastianvernis.workers.dev/api/cron/status

# Ver estado del cron CMS Nuevos 2
curl -s https://cms-nuevos2.sebastianvernis.workers.dev/api/cron/status

# Ver estado del cron CMS Nuevos 3
curl -s https://cms-nuevos3.sebastianvernis.workers.dev/api/cron/status

# Ver artículos CMS Originaux
curl -s "https://cms-originaux.sebastianvernis.workers.dev/api/articles?limit=5"

# Ver Facebook Monitor CMS Originaux
curl -s https://cms-originaux.sebastianvernis.workers.dev/api/facebook/monitor
```

## 🔐 Paneles CMS (Rutas internas)

Cada uno de los 4 CMS comparte la misma estructura de vistas SPA:

| Ruta | Vista | Descripción |
|------|-------|-------------|
| `#/dashboard` | Dashboard | Métricas generales y accesos rápidos |
| `#/articles` | Artículos | Lista de artículos parafraseados |
| `#/cms` | CMS | Artículos creados manualmente |
| `#/revision` | Revisión | Mesa de revisión de contenido |
| `#/monitor` | Monitor | Estado del sistema en vivo |
| `#/sites` | Sitios | Gestión de sitios del CMS |
| `#/users` | Usuarios | Gestión de usuarios y roles |

## 📈 Estado del Proyecto

| Componente | Estado | Descripción |
|------------|--------|-------------|
| **cms-originaux Worker** | ✅ Operativo | 10 sitios - Cron cada 30 min |
| **cms-nuevos Worker** | ✅ Operativo | 17 sitios - Cron cada 30 min |
| **cms-nuevos2 Worker** | ✅ Operativo | 8 sitios - Cron cada 30 min |
| **cms-nuevos3 Worker** | ✅ Operativo | 25 sitios - Cron cada 30 min |
| **10 Sitios Originaux** | ✅ Operativos | Todos desplegados |
| **17 Sitios Nuevos** | ✅ Operativos | Todos desplegados |
| **8 Sitios Nuevos 2** | ✅ Operativos | Todos desplegados |
| **25 Sitios Nuevos 3** | ✅ Operativos | Todos desplegados |
| **D1 Databases** | ✅ Configuradas | Una DB por CMS |
| **KV Namespaces** | ✅ Configurados | Uno por CMS |
| **R2 Bucket** | ✅ Configurado | `cms-news` compartido |
| **Portal NexoPress** | ✅ Operativo | Punto de entrada a los 4 CMS |

## 📝 Scripts Disponibles

### CMS Originaux
```bash
cd cms-originaux/scripts
python3 verify_27_sites.py
python3 verify_all_fb_tokens.py
python3 fb_full_report.py
```

### CMS Nuevos
```bash
cd cms-nuevos/scripts
python3 verify_27_sites.py
python3 verify_all_fb_tokens.py
```

### CMS Nuevos 2
```bash
cd cms-nuevos2/scripts
python3 verify_27_sites.py
python3 verify_all_fb_tokens.py
```

### CMS Nuevos 3
```bash
cd cms-nuevos3/scripts
python3 verify_27_sites.py
python3 verify_all_fb_tokens.py
```

## 🏗️ Arquitectura

```
                    ┌─────────────────────────┐
                    │   NexoPress Portal      │
                    │  nexopress.sebastian     │
                    │  vernis.space            │
                    └────────┬────────────────┘
                             │
             ┌────────────────┼────────────────┬────────────────┐
             ▼                ▼                ▼                ▼
┌───────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  CMS Originaux    │ │  CMS Nuevos      │ │  CMS Nuevos 2    │ │  CMS Nuevos 3    │
│  (cms-originaux)  │ │  (cms-nuevos)    │ │  (cms-nuevos2)   │ │  (cms-nuevos3)   │
│  10 sitios        │ │  17 sitios       │ │  8 sitios        │ │  25 sitios       │
│  API + Cron + FB  │ │  API + Cron + FB │ │  API + Cron + FB │ │  API + Cron + FB │
└────────┬──────────┘ └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                     │                     │                     │
         ▼                     ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ D1: news_db_    │  │ D1: news_db_    │  │ D1: news_db_    │  │ D1: news_db_    │
│ cms_originaux   │  │ cms_nuevos      │  │ cms_nuevos2     │  │ cms_nuevos3     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ KV: e6ceb0a...  │  │ KV: c90aab3a... │  │ KV: 0d0be368... │  │ KV: fbf21fb7... │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ R2: cms-news    │  │ R2: cms-news    │  │ R2: cms-news    │  │ R2: cms-news    │
│ (compartido)    │  │ (compartido)    │  │ (compartido)    │  │ (compartido)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Cloudflare Pages (60 sitios)                    │
│  cms-originaux/sites/  (10 sitios)                              │
│  cms-nuevos/sites/    (17 sitios)                               │
│  cms-nuevos2/sites/   (8 sitios)                                │
│  cms-nuevos3/sites/   (25 sitios)                               │
│  Cada sitio:                                                    │
│  - Frontend estático (HTML/CSS/JS)                              │
│  - Functions para SSR (middleware de artículos)                 │
│  - Open Graph meta tags dinámicas                               │
│  - Dominio personalizado configurable                           │
└─────────────────────────────────────────────────────────────────┘
```

---

© 2026 NexoPress Network. Todos los derechos reservados.
