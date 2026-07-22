-- 004_normalize_sitio_destino.sql
-- Normalizar SITIO_DESTINO a slug canónico (minúscula, sin tildes) solo para
-- los 9 valores legacy de sitios propios de cms-nuevos3.
--
-- Sitios canónicos en cms-nuevos3 (de SITIOS_LIST config.js, 25 sitios):
--   enfoque... enfoque se omite de esta lista porque ningún artículo
--   suyo usa MAYÚSCULAS CON TILDES. Los 9 aquí abajo son los que sí.
--
-- Variantes legacy detectadas 2026-07-13 (~630 filas):
--   NACIÓNALINSTANTE         72 -> nacionalinstante
--   REPÚBLICAMX              71 -> republicamx
--   MÉXICOPLUS               71 -> mexicoplus
--   POLÍTICASALVAJEALMINUTO  70 -> politicasalvajealminuto
--   MÉXICOENRESUMEN          70 -> mexicoenresumen
--   DIARIOMÉXICO             70 -> diariomexicano
--   WENEWSMÉXICO             69 -> wenewsmexico
--   ELANÁLISISMEXICANO       69 -> elanalisismexicano
--   AZTECAMÉXICONOTICIAS     68 -> aztecamexiconoticias
--
-- Alcance acotado: SOLO estos 9 valores (idempotente, verificable).
-- NO se tocan: nombres con espacios, basura (EJEMPLO.COM etc.), slugs cross-CMS,
-- ni los slugs canónicos ya correctamente normalizados.
--
-- D1 vía CLI wrangler d1 execute --file rechaza BEGIN TRANSACTION.
-- Cada UPDATE es atómico individualmente. Suficiente para este alcance.
--
-- Generado: 2026-07-13 tras deploy-verdict del SSR fix.
-- Backup: backups/pre_normalize_nuevos3_2026-07-13.sql

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'nacionalinstante'
WHERE SITIO_DESTINO = 'NACIÓNALINSTANTE';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'republicamx'
WHERE SITIO_DESTINO = 'REPÚBLICAMX';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'mexicoplus'
WHERE SITIO_DESTINO = 'MÉXICOPLUS';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'politicasalvajealminuto'
WHERE SITIO_DESTINO = 'POLÍTICASALVAJEALMINUTO';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'mexicoenresumen'
WHERE SITIO_DESTINO = 'MÉXICOENRESUMEN';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'diariomexicano'
WHERE SITIO_DESTINO = 'DIARIOMÉXICO';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'wenewsmexico'
WHERE SITIO_DESTINO = 'WENEWSMÉXICO';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'elanalisismexicano'
WHERE SITIO_DESTINO = 'ELANÁLISISMEXICANO';

UPDATE ARTICULOS_PARAFRASEADOS
SET SITIO_DESTINO = 'aztecamexiconoticias'
WHERE SITIO_DESTINO = 'AZTECAMÉXICONOTICIAS';
