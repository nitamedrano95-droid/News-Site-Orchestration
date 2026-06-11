# RUNBOOK — Aplicación supervisada de cambios en cms-nuevos4 (staging)

**Audiencia:** vos (Sebastian), ejecutando paso a paso desde Open Design /
Claude Design o terminal. El agente NO va a tocar la D1 ni hacer deploy
sin tu veredicto explícito.

**Entorno activo:** staging `chispakimnueve` (Account ID `cf8a5985...`)
- D1: `news_db_cms_nuevos4` (id `3230c0c3...`)
- KV: `ARTICLES_KV_NUEVOS4` (id `88a7e6ac...`)
- R2: `cms-news`
- Worker: `https://cms-nuevos4.chispakimnueve.workers.dev`

---

## Flujo general (4 fases, una decisión entre cada una)

```
[1] Validar plantillas  →  ¿OK?  →  [2] Dry-run del seed
       ↑                                    ↓
       └──── ¿editar JSON? ←──── ¿plan OK?  ↓
                                        ↓
                                [3] Aplicar a DB (--remote)
                                        ↓
                                ¿resultado OK?  →  [4] (opcional) Regenerar config.js
```

**Regla:** entre cada fase, vos revisás el output. Si algo no coincide
con lo esperado, parás, editás el JSON, y volvés a [1]. No hay
"auto-continuar".

---

## FASE 1 — Validar plantillas (solo lectura)

```bash
cd /home/sebastianvernis/projects/News-Site-Orchestration
node scripts/sites/validate-template.js
```

**Esperado:**
```
═══════════════════════════════════════════════════════
  Validación de plantillas de sitios — cms-nuevos4
═══════════════════════════════════════════════════════

  Sitios encontrados:   25
  Errores encontrados:  0
  Advertencias:         0
  ...
  ✓ OK — todas las plantillas son válidas
```

**Qué validar antes de seguir:**
- 25 sitios encontrados (no 24 ni 26)
- 0 errores
- Advertencias: revisar caso por caso, son opcionales

**Stop si:** hay errores. Editar el JSON que reporta, volver a correr.

---

## FASE 2 — Ver el plan sin aplicar

```bash
node scripts/sites/seed-cms-nuevos4.js --dry-run --remote
```

**Qué muestra (sin escribir nada):**
- 25 INSERT/UPDATE a `SITIOS` con todos los campos del template
- 25 INSERT OR IGNORE a `FB_TIMERS` (timers vacíos)
- 25 checks de `CATEGORIAS`
- El SQL exacto que se ejecutaría, a `/tmp/seed-cms-nuevos4.sql`

**Qué validar antes de seguir:**
- Slugs coinciden con los que querés
- `dominio` y `tagline` se ven bien (no hay `null` donde no debería)
- Colores son hex válidos
- No hay `facebook.page_id` o `facebook.page_token_secret` con datos
  reales (esos son sensibles — se cargan aparte con `wrangler secret put`)

**Stop si:** ves algo raro. Ajustar el JSON y volver a Fase 1.

---

## FASE 3 — Aplicar a la D1 (con backup previo)

### 3a. Backup (obligatorio)

```bash
cd cms-nuevos4
wrangler d1 export news_db_cms_nuevos4 --remote --output=backup-pre-seed-$(date +%Y%m%d-%H%M).sql
ls -lh backup-pre-seed-*.sql
```

**Esperado:** archivo >0 bytes. Guardalo fuera de `cms-nuevos4/` después
(no commitear).

### 3b. Aplicar el seed

```bash
cd /home/sebastianvernis/projects/News-Site-Orchestration
node scripts/sites/seed-cms-nuevos4.js --remote
```

**Qué hace:**
1. Valida los 25 JSONs (otra vez, por seguridad)
2. Genera `/tmp/seed-cms-nuevos4.sql`
3. Lo ejecuta con `wrangler d1 execute news_db_cms_nuevos4 --remote --file ...`
4. Muestra cada INSERT que se aplicó

**Si solo querés la DB sin tocar config.js:**
```bash
node scripts/sites/seed-cms-nuevos4.js --remote --no-config
```

**Si algo sale mal durante la ejecución:**
1. El script aborta al primer error de SQL
2. Como usa `ON CONFLICT(SLUG) DO UPDATE`, lo que se aplicó hasta el
   error queda persistido pero es idempotente — volver a correr es seguro
3. Si querés volver al estado anterior, restaurar el backup:
   ```bash
   wrangler d1 execute news_db_cms_nuevos4 --remote --file=backup-pre-seed-*.sql
   ```

### 3c. Verificar resultado

```bash
cd cms-nuevos4

# Conteo y muestra de 3 sitios
wrangler d1 execute news_db_cms_nuevos4 --remote --command \
  "SELECT SLUG, NOMBRE, TAGLINE, DOMINIO, ACTIVO FROM SITIOS ORDER BY SLUG LIMIT 3"

# FB_TIMERS (debe haber 25)
wrangler d1 execute news_db_cms_nuevos4 --remote --command \
  "SELECT COUNT(*) FROM FB_TIMERS"
```

**Esperado:** 25 filas en `SITIOS`, 25 en `FB_TIMERS`, `TAGLINE` y
`DOMINIO` ya no son `null`.

---

## FASE 4 (OPCIONAL) — Regenerar config.js desde las plantillas

> **Nota:** El `config.js` actual YA está regenerado (commit `8c5278c`).
> Esta fase solo es necesaria si cambiás las plantillas y querés que
> `SITIOS_LIST` / `SITE_DOMAIN_MAP` / `SITES_CONFIG` reflejen los nuevos
> slugs/dominios.

```bash
node scripts/sites/seed-cms-nuevos4.js --remote --no-db
```

Esto regenera `cms-nuevos4/src/config.js` sin tocar la D1. El archivo
queda staged para commit.

**Verificá el diff antes de commitear:**
```bash
cd /home/sebastianvernis/projects/News-Site-Orchestration
git diff cms-nuevos4/src/config.js | head -80
```

Si todo OK:
```bash
git add cms-nuevos4/src/config.js
git commit -m "chore(cms-nuevos4): regenerar config.js desde plantillas"
```

---

## Datos de prueba (artículos fake)

Para validar end-to-end que el refactor de `ARTICULOS_SITIO` funciona,
hay un SQL helper pre-armado en:

```
scripts/sites/sample-data/fake-articles.sql
```

**Uso:**
```bash
cd cms-nuevos4
wrangler d1 execute news_db_cms_nuevos4 --remote --file ../scripts/sites/sample-data/fake-articles.sql
```

Eso inserta 5 artículos de prueba (uno en cada categoría) en
`ARTICULOS_PARAFRASEADOS` + `ARTICULOS_SITIO` con los slugs
`bitacorainformativa`, `contextomexicano`, `codigomexico`,
`cronicanacionalmx`, `diariodelarepublica`. Ver el archivo para los
slugs exactos y los detalles.

**Después, smoke test:**
```bash
curl -s "https://cms-nuevos4.chispakimnueve.workers.dev/api/articles?site=bitacorainformativa" | jq '.articles | length'
# Esperado: 1

curl -s "https://cms-nuevos4.chispakimnueve.workers.dev/api/articles" | jq '.articles | length'
# Esperado: 5 (mezcla cross-site)

curl -s "https://cms-nuevos4.chispakimnueve.workers.dev/api/stats/dashboard"
# Esperado: {"articles": 5, ...}
```

**Limpiar los datos de prueba cuando termines:**
```bash
cd cms-nuevos4
wrangler d1 execute news_db_cms_nuevos4 --remote --command \
  "DELETE FROM ARTICULOS_SITIO WHERE ID_PARAFRASEADO IN (SELECT ID FROM ARTICULOS_PARAFRASEADOS WHERE SOURCE_URL LIKE 'https://test.nexopress.io/%')"
wrangler d1 execute news_db_cms_nuevos4 --remote --command \
  "DELETE FROM ARTICULOS_PARAFRASEADOS WHERE SOURCE_URL LIKE 'https://test.nexopress.io/%'"
```

---

## Decisión de deploy (NO automática)

El agente **no va a deployar** aunque vos completes las 4 fases. El
deploy lo hacés vos cuando estés conforme con el resultado en staging:

```bash
cd cms-nuevos4
wrangler deploy
```

El veredicto final es tuyo (per `AGENTS.md` regla §1.3 de
"deploy-verdict contract").

---

## Resumen de archivos tocados / creados en este runbook

| Archivo | Acción | Quién |
|---|---|---|
| `scripts/sites/RUNBOOK.md` | CREADO | agente (este archivo) |
| `scripts/sites/sample-data/fake-articles.sql` | CREADO | agente (este archivo) |
| `scripts/sites/seed-cms-nuevos4.js` | sin tocar | ya existía (Commit 1) |
| `scripts/sites/validate-template.js` | sin tocar | ya existía (Commit 1) |
| `scripts/sites/lib/*` | sin tocar | ya existían (Commit 1) |
| `data/sites/cms-nuevos4/*.json` | sin tocar | ya existían (Commit 1) |
| `cms-nuevos4/src/config.js` | sin tocar | ya regenerado (Commit 4) |
| D1 staging `news_db_cms_nuevos4` | sin tocar | vos lo tocás con Fase 3 |
