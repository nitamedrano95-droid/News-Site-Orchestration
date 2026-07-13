# Issue: Cron RSS con FUENTES dedicadas inactivas

> **Estado:** documentado pero NO implementado (decisión 2026-07-13).
> Causa raíz del sub-asignamiento observado en Vertice Noticias (3 art/7d) y Finance & Markets MX (3 art/7d) vs sus hermanos.

---

## Síntomas

| Sitio                  | CMS           | Art/7d  |
|------------------------|---------------|---------|
| bitacoraurbana         | cms-originaux | 27      |
| radiocinconoticias     | cms-originaux | 25      |
| cbnnoticias            | cms-originaux | 25      |
| **verticenoticias**    | cms-originaux | **3**   |
| tvmexico               | cms-originaux | 2       |
| enfoquemexicano        | cms-nuevos3   | 22      |
| diariomexicano         | cms-nuevos3   | 18      |
| **financemarketsmx**   | cms-nuevos3   | **3**   |
| mexicoplus             | cms-nuevos3   | 2       |
| republicamx            | cms-nuevos3   | 1       |

Vertice/Finance están al **fondo** de su CMS, pero **no por falta de configuración**: ambos tienen 3 fuentes asignadas en la tabla `FUENTES`.

---

## Causa raíz

`cms-originaux/src/cron/rss-ingest.js` y `cms-nuevos3/src/cron/rss-ingest.js` (línea ~705) cargan:

```js
'SELECT * FROM FUENTES WHERE ACTIVA = 1 ...'
```

Y luego procesan con lógica de rotación por `PRIORIDAD` (commit que agregó rotación en 2026-06-02).

**Verificación en cms-originaux D1 (2026-07-13):**

```sql
PRAGMA table_info(FUENTES)
-- Columnas: ID, SITIO_SLUG, NOMBRE, URL, TIPO, SELECTORES_LINKS, ...
-- NO EXISTE COLUMNA PRIORIDAD

SELECT F.NOMBRE, F.URL, MAX(A.FECHA_PUBLICACION) as ultimo_art
FROM FUENTES F LEFT JOIN ARTICULOS_PARAFRASEADOS A ON A.SOURCE_URL = F.URL
WHERE F.ACTIVA = 1 AND F.SITIO_SLUG = 'verticenoticias' GROUP BY F.ID
-- Resultado: 3 filas, todas con ultimo_art = NULL
```

**Conclusiones:**
1. La columna `PRIORIDAD` no existe en cms-originaux (la rotación de 2026-06-02 asume su existencia).
2. **Ninguna** fuente dedicada (incluso las de bitacora/cbn) ha producido artículos. Todos los artículos vienen del fallback `LEGACY_FEEDS`.
3. La diferencia entre bitacora (27/7d) y Vertice (3/7d) NO es de fuentes dedicadas sino del **algoritmo de rotación de LEGACY_FEEDS** que favorece a algunos sitios estructuralmente.

---

## Por qué se documenta pero no se implementa ahora

1. **Alcance fuera del "fix seguro"**. Requiere revisar logs de wrangler tail, posiblemente código del cron, posiblemente normalizar la tabla FUENTES con columna PRIORIDAD.
2. **Riesgo alto**. Un cron que rompe puede dejar TODOS los sitios sin publicación por horas.
3. **No es urgente para el deploy-verdict**. Los 2 sitios auditados (Vertice, Finance) tienen contenido, solo reciben menos artículos de lo ideal.

---

## Cuando retomar

- Después de estabilizar los fixes del plan `2026-07-13-fixes-seguros-cms.md`.
- Antes de cualquier growth push a esos 2 sitios (no invertir adquisición en sitios rotos).
- Si n8n migra o cambia la lógica de asignación.

---

## Pasos de remediación sugeridos (cuando se ejecute)

1. **Auditoría**: `SELECT SITIO_SLUG, COUNT(*) FROM FUENTES WHERE ACTIVA = 1 GROUP BY SITIO_SLUG` en cada DB. Confirmar distribución pareja.
2. **Schema**: agregar `ALTER TABLE FUENTES ADD COLUMN PRIORIDAD INTEGER DEFAULT 1` en cms-originaux (idempotente, no destructivo).
3. **Smoke test del cron**: en modo `--local`, ejecutar la sección del cron que toca `FUENTES`, ver que no falla por columna faltante.
4. **Logs**: agregar `console.log` por cada fuente dedicada procesada, para detectar silenciosos.
5. **Rotación**: si la rotación actual es desigual, considerar algoritmo round-robin puro en lugar de prioridad por fuente.
6. **Validación**: durante 24h post-fix, contar artículos asignados por sitio y verificar distribución pareja.

---

## Referencias

- `cms-originaux/src/cron/rss-ingest.js` línea 705-815
- `cms-nuevos3/src/cron/rss-ingest.js` línea 705-815
- `scripts/fixes/2026-07-08-originaux-backfill-sitios.sql` (backfill manual que enmascaró el problema)
- Diagnóstico completo en historial de esta sesión (2026-07-13).