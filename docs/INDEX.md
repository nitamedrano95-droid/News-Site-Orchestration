# Índice de documentación — NexoPress

> **Última actualización:** 2026-06-10
> Mantenido manualmente. Si agregás un documento nuevo, anotalo acá.

## Punto de entrada

| Archivo | Para qué |
|---|---|
| `../README.md` | Resumen ejecutivo + estado del proyecto |
| [`AGENTS.md`](AGENTS.md) | **Directriz canónica para toda IA** (single source of truth) |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Convenciones de código y workflow para humanos |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Diagramas del sistema |

## Documentos operativos

| Archivo | Tema |
|---|---|
| [`API_REFERENCE.md`](API_REFERENCE.md) | Endpoints del Worker |
| [`PASSWORD_RESET_SYSTEM.md`](PASSWORD_RESET_SYSTEM.md) | Admin y seguridad |
| [`ROUTE_DOCUMENTATION.md`](ROUTE_DOCUMENTATION.md) | URLs en Pages y Worker |
| [`FACEBOOK_TOKEN_SETUP.md`](FACEBOOK_TOKEN_SETUP.md) | Setup de tokens de Facebook |
| [`SYSTEM_MONITOR.md`](SYSTEM_MONITOR.md) | Diagnóstico de crons, ingesta, FB |
| [`QUICK_START.md`](QUICK_START.md) | Onboarding rápido |

## Guías operativas

Ver [`guides/`](guides/):
- `GUIA_CREAR_NUEVO_SITIO_CMS.md` — agregar sitio a un CMS
- `GUIA_SITIOS_ESTATICOS.md` — cómo funcionan los sitios estáticos
- `MANUAL_INTEGRACION_NUEVOS_SITIOS.md`
- `NUEVO_SITIO_REQUISITOS_TECNICOS.md`
- `MATRIZ_GESTION_SITIOS_NUEVOS.md`
- `nexopress-hub-deploy.md` — deploy del Hub

## Planes

Ver [`plans/`](plans/):
- `2026-06-10-nexopress-hub.md` — plan de implementación del Hub

## Análisis y reportes

Ver [`analysis/`](analysis/).

## Histórico

Ver [`history/`](history/) — snapshots de estados puntuales.

## Archivado (no usar como referencia)

Ver [`archive/`](archive/). Archivos movidos acá porque su contenido
fue consolidado en `AGENTS.md` o porque están desactualizados:
- `archive/GEMINI.md` — snapshot del estado con Gemini (jun 2026)
- `archive/QWEN.md` — snapshot del estado con Qwen (jun 2026)
- `archive/INDEX-2026-06-10.md` — versión anterior de este índice

## Convenciones del directorio

- Los archivos en raíz de `docs/` son **fuente de verdad vigente**.
- Los archivos en `archive/` se conservan **solo para trazabilidad**.
- Cualquier duplicación entre `archive/` y los archivos vigentes es
  intencional y se resuelve a favor de los vigentes.
