# NexoPress Deploy Wizard

Asistente de despliegue Docker interactivo para NexoPress — sistema multi-sitio de publicación de noticias.

## ¿Qué es esto?

Un wizard web que guía la configuración y despliegue de toda la infraestructura NexoPress en Docker, como alternativa a Cloudflare Workers/Pages.

**Servicios que orquesta:**
- 4 CMS Workers (cms-originaux, cms-nuevos, cms-nuevos2, cms-nuevos3) → Node.js + Hono
- SQLite (reemplaza Cloudflare D1)
- Redis (reemplaza Cloudflare KV)
- MinIO (reemplaza Cloudflare R2)
- nginx (reverse proxy)
- n8n (workflows de ingesta opcionales)

## Inicio rápido

```bash
# 1. Construir e iniciar solo el wizard
cd deploy-wizard
docker build -t nexopress-wizard .
docker run -p 8080:8080 -v /var/run/docker.sock:/var/run/docker.sock nexopress-wizard

# 2. Abrir el wizard
open http://localhost:8080

# 3. Completar los 6 pasos del wizard y hacer clic en "🚀 Iniciar Deploy"
```

O alternativamente, sin Docker primero:

```bash
cd deploy-wizard/wizard
npm install
node server.js
# Abrir http://localhost:8080
```

## Estructura

```
deploy-wizard/
├── Dockerfile                  # Imagen del wizard
├── docker-compose.yml          # Stack completo (referencia / generado por wizard)
├── wizard/
│   ├── server.js               # Backend Express (API + generación de configs)
│   ├── package.json
│   └── public/
│       └── index.html          # UI dark-theme 6 pasos
├── cms-adapter/
│   ├── adapter.js              # Polyfills D1→SQLite, KV→Redis, R2→MinIO
│   ├── Dockerfile
│   └── adapter-package.json
├── nginx/
│   ├── nginx.conf
│   └── Dockerfile
├── redis/redis.conf
├── envs/
│   └── *.env.example           # Plantillas de variables por CMS
├── n8n/
│   └── nexopress-workflow.json # Workflow n8n de ejemplo (ingesta RSS→CMS)
└── scripts/
    ├── deploy.sh               # Script de despliegue manual
    └── init-db.sh              # Inicialización de bases de datos
```

## Pasos del Wizard

| Paso | Descripción |
|------|-------------|
| 1 | Selección de CMS a desplegar (1-4) |
| 2 | Configuración de sitios (nombre, dominio, tagline) |
| 3 | Variables de entorno y credenciales (OpenRouter, Telegram, Facebook, APIs) |
| 4 | Fuentes de ingesta (RSS/Atom, NewsAPI, Google News, Redes Sociales, n8n) |
| 5 | Diseño visual de los sitios (tema, colores, tipografía, features) |
| 6 | Resumen, preview de configuración y deploy |

## APIs del wizard backend

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/health` | GET | Estado del servicio |
| `/api/deploy/generate` | POST | Genera docker-compose.yml + .env files |
| `/api/deploy/download` | GET | Descarga ZIP con toda la configuración |
| `/api/deploy/start` | POST | Ejecuta `docker compose up -d --build` |
| `/api/deploy/logs` | GET | SSE stream de logs del deploy |
| `/api/deploy/status` | GET | Estado actual del deploy |
| `/api/n8n/webhook` | POST | Recibe artículos desde workflows n8n |

## Adaptación Cloudflare → Docker

| Cloudflare | Docker |
|------------|--------|
| D1 (SQLite) | SQLite vía `better-sqlite3` |
| KV Namespace | Redis 7 |
| R2 Bucket | MinIO (S3-compatible) |
| Workers Runtime | Node.js 20 + `@hono/node-server` |
| Scheduled triggers | Cron interno (setTimeout) |
| Cloudflare AI | OpenRouter API (configurable) |

## Integración n8n

El archivo `n8n/nexopress-workflow.json` es un workflow exportado de n8n que:
1. Hace polling de RSS feeds cada 30 minutos
2. Extrae contenido completo del artículo
3. Envía al CMS vía `POST /api/n8n/webhook`

Para importarlo: n8n → Workflows → Import from File.

## Variables de entorno requeridas

Ver `envs/cms-originaux.env.example` para la lista completa. Las mínimas obligatorias:

```
ADMIN_TOKEN=<32 chars mínimo>
OPENROUTER_API_KEY=sk-or-...
```

Todo lo demás es opcional pero recomendado para funcionalidad completa.
