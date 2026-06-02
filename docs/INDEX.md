# Índice Documental — NexoPress

> **Nota:** este INDEX está parcialmente desactualizado. El README raíz
> (`/README.md`), `CLAUDE.md` y `ARCHITECTURE.md` son la fuente de verdad sobre
> el estado del proyecto. Este documento se enfoca en cómo está organizada la
> documentación dentro de `docs/`.

## Estructura de `docs/`

```
docs/
├── INDEX.md                          ← este archivo
│
├── Documentación de operación
│   ├── SYSTEM_MONITOR.md             Diagnóstico de crons, ingesta y Facebook
│   ├── API_REFERENCE.md              Endpoints del Worker
│   ├── PASSWORD_RESET_SYSTEM.md      Administradores y seguridad
│   ├── ROUTE_DOCUMENTATION.md        URLs en Pages y Worker
│   ├── FACEBOOK_TOKEN_SETUP.md       Configuración de tokens
│   ├── CONTRIBUTING.md               Guía de contribución
│   ├── PROJECT_STRUCTURE.md          Estructura del proyecto
│   ├── QUICK_START.md                Onboarding rápido
│   ├── QUICK_START_NEW_SITES.md      Onboarding para nuevos sitios
│   └── TODO.md                       Pendientes
│
├── guides/                           Guías operativas extensas
│   ├── GUIA_CREAR_NUEVO_SITIO_CMS.md Crear un nuevo sitio en un CMS
│   ├── GUIA_SITIOS_ESTATICOS.md      Cómo funcionan los sitios estáticos
│   ├── MANUAL_INTEGRACION_NUEVOS_SITIOS.md
│   ├── NUEVO_SITIO_REQUISITOS_TECNICOS.md
│   └── MATRIZ_GESTION_SITIOS_NUEVOS.md
│
├── analysis/                         Reportes de análisis
│   ├── DISEÑOS_STITCH_ANÁLISIS.md
│   ├── REPORTE_ANALISIS_FLUJO_PUBLICACION.md
│   ├── REPORTE_PUBLICACION_AUTOMATICA.md
│   └── REPORTE_ESTATUS_FACEBOOK.md
│
├── history/                          Documentos históricos / status puntuales
│   ├── FINAL_SETUP.md
│   ├── CMS_NUEVOS3_STATUS.md
│   ├── ENGAGEMENT_AGENT_BRIEF.txt
│   ├── cms-nuevos3-setup-summary.md  (antes .SETUP_SUMMARY.md en raíz)
│   └── session-ses_2013.md           Transcripción de debug de slugs en FB
│
├── archive/                          Docs obsoletas / hitorial de desarrollo
│   ├── README.md, CMS_GUIDE.md, CMS_VERIFICATION.md  (flujo antiguo 1 CMS)
│   ├── REPORTE_*.md antiguos
│   ├── clean_html_*.sql, *.sh, *.py deprecados
│   └── ... (ver `archive/` directo)
│
├── migrations/                       Scripts SQL históricos
│
└── Docs legacy de proveedores (decisión de jun 2026)
    ├── GEMINI.md                     Snapshot del estado con Gemini
    ├── QWEN.md                       Snapshot del estado con Qwen
    └── archive/GEMINI.md, archive/QWEN.md   Versiones más antiguas
```

## Estructura del repo (referencia rápida)

```
News-Site-Orchestration/
├── cms-originaux/        10 sitios (1ª generación, sistema principal)
├── cms-nuevos/           17 sitios (2ª generación)
├── cms-nuevos2/           8 sitios (3ª generación)
├── cms-nuevos3/          25 sitios (4ª generación, la más grande)
├── cms-selector/          versión legacy (idéntica a las otras, conservada)
│
├── nexopress-portal/     Portal unificado → nexopress.sebastianvernis.space
├── deploy-wizard/        Wizard de setup de credenciales
├── health-monitor/       Monitor de salud
├── _template/            Plantilla para nuevos sitios
│
├── scripts/              Scripts de mantenimiento one-off
│   ├── README.md         Índice con descripción de cada script
│   ├── fixes/            Correcciones puntuales
│   ├── data-migration/   Migraciones masivas
│   ├── cms-internal/     Mantenimiento de plataforma
│   ├── design/           Assets de diseño
│   ├── deploy/           Scripts de deploy alternativos
│   ├── n8n/              Workflows n8n como código
│   └── legacy-css/       Hojas de estilo históricas
│
├── docs/                 Esta documentación
├── designs/              Mockups y design tokens (Figma, .lib.pen)
├── backups/              Snapshots y "Lógica Anterior" (no tocar)
│
├── README.md             Punto de entrada principal
├── CLAUDE.md             Guía específica para Claude Code
├── ARCHITECTURE.md       Diagramas de arquitectura
├── AGENTS.md             Convención para agentes IA (GitNexus + LLM)
├── package.json          Dependencias del repo raíz
├── wrangler.toml         Referencia de config Cloudflare
├── .env.example          Plantilla de variables de entorno
└── .gitignore            Reglas de ignore
```

## URLs de producción

| Servicio | URL |
|----------|-----|
| Portal NexoPress | https://nexopress.sebastianvernis.space |
| CMS Originaux | https://cms-originaux.sebastianvernis.workers.dev/admin/ |
| CMS Nuevos | https://cms-nuevos.sebastianvernis.workers.dev/admin/ |
| CMS Nuevos 2 | https://cms-nuevos2.sebastianvernis.workers.dev/admin/ |
| CMS Nuevos 3 | https://cms-nuevos3.sebastianvernis.workers.dev/admin/ |
