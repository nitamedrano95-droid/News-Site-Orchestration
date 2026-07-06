Migración de dominio de imágenes (DBs D1)
============================================

Fecha: 20260704
Objetivo: sustituir todas las URLs con host
  https://uploads.sebastianvernis.space
por
  https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev

Pre-flight (verificado el 20260704):
  - GET /api/articles -> 200 en cms-originaux, cms-nuevos, cms-nuevos2, cms-nuevos3
  - cms-nuevos4: 200 con []. Vacía, sin cambios.
  - git status en los 5 repos CMS: limpio (los cambios detectados en
    .serena/ y .github/agents/ son del directorio padre, no de los CMS).
  - production NO fue tocada antes de este cambio.

Backup:
  /home/sebastianvernis/backups/d1-pre-domain-fix-20260704-211716/
    news_db_cms_originaux.sql   (24348 KB)
    news_db_cms_nuevos.sql      (19006 KB)
    news_db_cms_nuevos2.sql     (8985 KB)
    news_db_cms_nuevos3.sql     (15360 KB)

Archivos generados:
  cms-originaux-migrate-domain.sql
  cms-nuevos-migrate-domain.sql
  cms-nuevos2-migrate-domain.sql
  cms-nuevos3-migrate-domain.sql

Conteo esperado (filas a modificar):

  cms-originaux
    ARTICULOS_CMS.URL_IMAGEN          :  20
    ARTICULOS_CMS.CONTENIDO           :   0
    ARTICULOS_ORIGINALES.URL_IMAGEN   :   1
    ARTICULOS_PARAFRASEADOS.CONTENIDO :   8
    -------------------------------------------
    total filas con OLD               :  29
  cms-nuevos
    ARTICULOS_CMS.URL_IMAGEN          :   6
    ARTICULOS_PARAFRASEADOS.URL_IMAGEN: 2118
    ARTICULOS_PARAFRASEADOS.CONTENIDO :   9
    -------------------------------------------
    total                             : 2133
  cms-nuevos2
    ARTICULOS_CMS.URL_IMAGEN          :   2
    ARTICULOS_ORIGINALES.URL_IMAGEN   :   2
    ARTICULOS_PARAFRASEADOS.URL_IMAGEN: 1030
    ARTICULOS_PARAFRASEADOS.CONTENIDO :   3
    -------------------------------------------
    total                             : 1037
  cms-nuevos3
    ARTICULOS_CMS.URL_IMAGEN          :  41
    ARTICULOS_CMS.CONTENIDO           :   1
    ARTICULOS_PARAFRASEADOS.URL_IMAGEN: 2313
    ARTICULOS_PARAFRASEADOS.CONTENIDO :   7
    -------------------------------------------
    total                             : 2362
  cms-nuevos4: 0 (vacía)

Cómo ejecutar (ejemplo cms-originaux):
  cd /home/sebastianvernis/projects/News-Site-Orchestration/cms-originaux
  npx wrangler d1 execute news_db_cms_originaux --remote \
    --file=scripts/fixes/2026-07-04-d1-domain-migration/cms-originaux-migrate-domain.sql

Si algo sale mal, rollback = restaurar el .sql del backup con:
  npx wrangler d1 execute news_db_cms_<name> --remote \
    --file=/home/sebastianvernis/backups/d1-pre-domain-fix-20260704-211716/news_db_cms_<name>.sql

Por qué REPLACE y no sólo UPDATE con =:
  REPLACE(X, A, B) reemplaza TODAS las ocurrencias de A dentro de X.
  En columnas URL_IMAGEN hay una URL por fila, pero en CONTENIDO
  puede haber <img src=...> inline. REPLACE cubre ambos.

Idempotencia:
  - Si lo corrés 2 veces, la 2da pasada el WHERE LIKE no matchea nada
    y los UPDATE no modifican filas. Verificable con los SELECT de
    post-check.
