Re-migración de host de imágenes (D1) — paquete 2026-07-06
==========================================================

Fecha:        20260706
Estado:       PENDIENTE DE APROBACIÓN. NO EJECUTAR sin veredicto del usuario.
Diagnóstico:  ver "Por qué" abajo.

Por qué
-------

La migración del 2026-07-04 (paquete `../2026-07-04-d1-domain-migration/`)
movió 7.231 filas de `uploads.sebastianvernis.space` a
`pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev` (que es el subdominio público
del bucket `cms-news`).

Pero los objetos de imagen NO están en `cms-news`. Estaban y siguen
estando en otro bucket R2 de la misma cuenta (mismo colo QRO) cuyo
subdominio público es `pub-98fc7afcc6f14264b5c779748d7de4b5.r2.dev`.
Verificado 2026-07-06 22:55 UTC:

  GET https://pub-98fc7afcc6f14264b5c779748d7de4b5.r2.dev/jordan-henderson-fuera-mundial-lesion-festejo.jpeg
  -> 200 image/jpeg 82171 bytes
  -> (esa URL aparece en la DB de cms-originaux hoy, en un artículo público)

Muestreo de 12 artículos en producción (2026-07-06):
  - 11 / 12 artículos tienen URL en `pub-98fc7afc…`
  - 1  / 12 tiene URL en `pub-42bf…`  (el único que el endpoint /api/images/<key>
                                       del Worker podía resolver, porque ese
                                       objeto sí existe en cms-news)

El bucket `pub-98fc7afc…` no aparece en `wrangler r2 bucket list`
(la CLI no lo muestra), pero SÍ responde a GETs. Mismo CF-RAY prefix
que `pub-42bf…` (colo QRO) → misma cuenta Cloudflare.

Resumen
-------

Viejo:  https://uploads.sebastianvernis.space                  (muerto)
Medio:  https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev   (cms-news, equivocado)
Nuevo:  https://pub-98fc7afcc6f14264b5c779748d7de4b5.r2.dev   (bucket real con las imágenes)

Si la DB queda en `pub-42bf…`, las URLs son técnicamente válidas
(el bucket existe y es público) pero la mayoría de las imágenes son
404 porque los objetos están en `pub-98fc7afc…`.

Archivos
--------

  _template.sql             - plantilla con placeholders (__OLD__, __NEW__, __CMS__)
  generate-sql.sh           - genera los 4 SQL por CMS a partir del template
  backup.sh                 - exporta las 4 DBs D1 a /home/sebastianvernis/backups/
  cms-{originaux,nuevos,nuevos2,nuevos3}-rebucket.sql
                            - SQL generados, listos para aplicar (NO generados aún
                              — correr generate-sql.sh primero)

Pasos para aplicar (cuando vos lo apruebes)
-------------------------------------------

  1. Backup:
       bash scripts/fixes/2026-07-06-d1-rebucket/backup.sh
     (o usar el backup de 2026-07-04-211716 si todavía está disponible)

  2. Generar los 4 SQL:
       bash scripts/fixes/2026-07-06-d1-rebucket/generate-sql.sh

  3. Revisar diff vs. los SQL del 2026-07-04 (debería ser idéntico salvo OLD/NEW).

  4. Pre-check (opcional, mirar los conteos esperados):
       npx wrangler d1 execute news_db_cms_originaux --remote \
         --command "SELECT 'ARTICULOS_CMS.URL_IMAGEN' AS k, COUNT(*) AS n FROM ARTICULOS_CMS WHERE URL_IMAGEN LIKE '%pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev%'"

  5. Aplicar (en este orden, por si algo falla a mitad):
       cd cms-originaux && npx wrangler d1 execute news_db_cms_originaux --remote --file=../scripts/fixes/2026-07-06-d1-rebucket/cms-originaux-rebucket.sql
       cd ../cms-nuevos    && npx wrangler d1 execute news_db_cms_nuevos    --remote --file=../scripts/fixes/2026-07-06-d1-rebucket/cms-nuevos-rebucket.sql
       cd ../cms-nuevos2   && npx wrangler d1 execute news_db_cms_nuevos2   --remote --file=../scripts/fixes/2026-07-06-d1-rebucket/cms-nuevos2-rebucket.sql
       cd ../cms-nuevos3   && npx wrangler d1 execute news_db_cms_nuevos3   --remote --file=../scripts/fixes/2026-07-06-d1-rebucket/cms-nuevos3-rebucket.sql

  6. Verificar:
       curl -sI <un article URL> | grep -i image
       abrir 2-3 sitios en navegador y confirmar que las imágenes cargan

  7. Si algo salió mal, rollback:
       wrangler d1 execute news_db_cms_<name> --remote \
         --file=/home/sebastianvernis/backups/d1-pre-rebucket-<TS>/news_db_cms_<name>.sql

Por qué REPLACE y no sólo UPDATE con =
---------------------------------------

REPLACE(X, A, B) reemplaza TODAS las ocurrencias de A dentro de X.
En columnas URL_IMAGEN hay una URL por fila, pero en CONTENIDO puede
haber <img src=...> inline. REPLACE cubre ambos.

Por qué cms-nuevos4 no tiene script
------------------------------------

cms-nuevos4 (news_db_cms_nuevos4) está vacía. Conteos NEW/OLD = 0.
No hay nada que migrar.

Idempotencia
------------

Si el script se corre dos veces, la 2da pasada el WHERE LIKE no
matchea nada (ya no quedan filas con OLD) y los UPDATE no modifican
filas. Verificable con los SELECT de post-check.

Riesgo conocido
---------------

El bucket `pub-98fc7afcc6f14264b5c779748d7de4b5.r2.dev` no aparece
en `wrangler r2 bucket list`. Eso significa que la CLI no tiene
acceso a él con el token actual, o que está en otra cuenta. Si está
en otra cuenta, re-migrar la DB a su subdominio pone la plataforma
en una posición frágil (depende de un bucket fuera de tu control).

Si vos confirmás que el bucket está en tu cuenta, este plan es
seguro. Si tenés dudas, conviene primero identificar el nombre real
del bucket vía el dashboard de Cloudflare o un listado via API REST
antes de aplicar la re-migración.

Pre-flight
----------

  5/5 CMS responden 200 en /api/articles
  Produccion no fue tocada por la generación de este script
  git status: cambios del paquete anterior commiteados, este sin stagear
