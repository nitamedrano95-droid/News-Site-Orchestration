-- 004_normalize_sitio_destino.sql
-- Normalizar SITIO_DESTINO a slug canónico (minúscula, sin tildes) solo para
-- los 4 sitios propios de cms-originaux que tienen variantes con tildes.
--
-- Sitios canónicos en cms-originaux (de SITIOS_LIST config.js):
--   bitacoraurbana, cbnnoticias, centralmexico, mexicoinformado,
--   nodoinformativo, noticiasobjetivo, radiocinconoticias,
--   reportecentralmx, tvmexico, verticenoticias
--
-- Variantes legacy problemáticas detectadas 2026-07-13 (133 filas):
--   TVMÉXICO       85 filas  -> tvmexico
--   VÉRTICENOTICIAS 84 filas -> verticenoticias
--   CENTRALMÉXICO  82 filas  -> centralmexico
--   TMZNEWSMÉXICO  79 filas  -> tmznewsmexico (NO en SITIOS_LIST pero plausible)
--   Vértice Noticias  1 fila  -> verticenoticias (Title Case)
--
-- Alcance acotado: SOLO estos 5 valores (idempotente, verificable).
-- NO se tocan: nombres con espacios humanos, ELUNIVERSAL (34 filas),
-- ejemplos/pruebas, NACIONAL, NOTICIAS, slug que no estén en la lista
-- explícita de arriba.
--
-- Pre-flight (ejecutar antes en --remote y guardar resultado):
--   SELECT COUNT(*) FROM ARTICULOS_PARAFRASEADOS
--   WHERE SITIO_DESTINO IN ('TVMÉXICO','VÉRTICENOTICIAS',
--   'CENTRALMÉXICO','TMZNEWSMÉXICO','Vértice Noticias');
--
-- Rollback (en caso de necesitarlo):
--   UPDATE ARTICULOS_PARAFRASEADOS SET SITIO_DESTINO='VÉRTICENOTICIAS'
--     WHERE SITIO_DESTINO='verticenoticias' AND rowid IN (...);
--
-- Generado: 2026-07-13 tras deploy-verdict del SSR fix.
-- Ejecutado por: [pendiente — esperar OK]

-- D1 rechaza BEGIN TRANSACTION vía CLI wrangler d1 execute --file.
-- Cada UPDATE es atómico individualmente en D1 (suficiente para este alcance
-- acotado de 5 valores). Si en el futuro se necesita atomicidad multi-statement,
-- usar el API JS con state.storage.transaction() desde un Worker.

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'tvmexico'
WHERE SITIO_DESTINO = 'TVMÉXICO';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'verticenoticias'
WHERE SITIO_DESTINO = 'VÉRTICENOTICIAS';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'centralmexico'
WHERE SITIO_DESTINO = 'CENTRALMÉXICO';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'tmznewsmexico'
WHERE SITIO_DESTINO = 'TMZNEWSMÉXICO';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'verticenoticias'
WHERE SITIO_DESTINO = 'Vértice Noticias';
