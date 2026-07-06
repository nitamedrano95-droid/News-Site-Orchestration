-- Migración de dominio de imágenes: uploads.sebastianvernis.space -> R2 public
-- CMS: cms-nuevos
-- Fecha: 20260704
-- Generado por Hermes. EJECUTAR SOLO TRAS BACKUP y REVISIÓN.
-- Pre-flight prod verificado: 4 CMS con 200 OK, git status limpio.
-- Backup: /home/sebastianvernis/backups/d1-pre-domain-fix-20260704-211716/
--
-- OLD: https://uploads.sebastianvernis.space
-- NEW: https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev
--
-- IMPORTANTE: este script es idempotente. Si se corre dos veces,
--   la segunda ejecución no modifica nada (no quedan OLD).

-- ===== Pre-check: contar ocurrencias antes =====
-- (esperado: 0 al terminar)
SELECT 'ARTICULOS_CMS.URL_IMAGEN' AS k, COUNT(*) AS n FROM ARTICULOS_CMS WHERE URL_IMAGEN LIKE '%uploads.sebastianvernis.space%';
SELECT 'ARTICULOS_CMS.CONTENIDO' AS k, COUNT(*) AS n FROM ARTICULOS_CMS WHERE CONTENIDO LIKE '%uploads.sebastianvernis.space%';
SELECT 'ARTICULOS_ORIGINALES.URL_IMAGEN' AS k, COUNT(*) AS n FROM ARTICULOS_ORIGINALES WHERE URL_IMAGEN LIKE '%uploads.sebastianvernis.space%';
SELECT 'ARTICULOS_ORIGINALES.URL_IMAGEN2' AS k, COUNT(*) AS n FROM ARTICULOS_ORIGINALES WHERE URL_IMAGEN2 LIKE '%uploads.sebastianvernis.space%';
SELECT 'ARTICULOS_PARAFRASEADOS.URL_IMAGEN' AS k, COUNT(*) AS n FROM ARTICULOS_PARAFRASEADOS WHERE URL_IMAGEN LIKE '%uploads.sebastianvernis.space%';
SELECT 'ARTICULOS_PARAFRASEADOS.CONTENIDO' AS k, COUNT(*) AS n FROM ARTICULOS_PARAFRASEADOS WHERE CONTENIDO LIKE '%uploads.sebastianvernis.space%';

-- ===== UPDATE: sustitución de host =====
UPDATE ARTICULOS_CMS SET URL_IMAGEN = REPLACE(URL_IMAGEN, 'https://uploads.sebastianvernis.space', 'https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev') WHERE URL_IMAGEN LIKE '%uploads.sebastianvernis.space%';
UPDATE ARTICULOS_CMS SET CONTENIDO = REPLACE(CONTENIDO, 'https://uploads.sebastianvernis.space', 'https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev') WHERE CONTENIDO LIKE '%uploads.sebastianvernis.space%';
UPDATE ARTICULOS_ORIGINALES SET URL_IMAGEN = REPLACE(URL_IMAGEN, 'https://uploads.sebastianvernis.space', 'https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev') WHERE URL_IMAGEN LIKE '%uploads.sebastianvernis.space%';
UPDATE ARTICULOS_ORIGINALES SET URL_IMAGEN2 = REPLACE(URL_IMAGEN2, 'https://uploads.sebastianvernis.space', 'https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev') WHERE URL_IMAGEN2 LIKE '%uploads.sebastianvernis.space%';
UPDATE ARTICULOS_PARAFRASEADOS SET URL_IMAGEN = REPLACE(URL_IMAGEN, 'https://uploads.sebastianvernis.space', 'https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev') WHERE URL_IMAGEN LIKE '%uploads.sebastianvernis.space%';
UPDATE ARTICULOS_PARAFRASEADOS SET CONTENIDO = REPLACE(CONTENIDO, 'https://uploads.sebastianvernis.space', 'https://pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev') WHERE CONTENIDO LIKE '%uploads.sebastianvernis.space%';

-- ===== Post-check: contar ocurrencias del dominio viejo (debe ser 0) =====
SELECT 'ARTICULOS_CMS.URL_IMAGEN' AS k, COUNT(*) AS n FROM ARTICULOS_CMS WHERE URL_IMAGEN LIKE '%uploads.sebastianvernis.space%';
SELECT 'ARTICULOS_CMS.CONTENIDO' AS k, COUNT(*) AS n FROM ARTICULOS_CMS WHERE CONTENIDO LIKE '%uploads.sebastianvernis.space%';
SELECT 'ARTICULOS_ORIGINALES.URL_IMAGEN' AS k, COUNT(*) AS n FROM ARTICULOS_ORIGINALES WHERE URL_IMAGEN LIKE '%uploads.sebastianvernis.space%';
SELECT 'ARTICULOS_ORIGINALES.URL_IMAGEN2' AS k, COUNT(*) AS n FROM ARTICULOS_ORIGINALES WHERE URL_IMAGEN2 LIKE '%uploads.sebastianvernis.space%';
SELECT 'ARTICULOS_PARAFRASEADOS.URL_IMAGEN' AS k, COUNT(*) AS n FROM ARTICULOS_PARAFRASEADOS WHERE URL_IMAGEN LIKE '%uploads.sebastianvernis.space%';
SELECT 'ARTICULOS_PARAFRASEADOS.CONTENIDO' AS k, COUNT(*) AS n FROM ARTICULOS_PARAFRASEADOS WHERE CONTENIDO LIKE '%uploads.sebastianvernis.space%';

-- ===== Post-check: contar URLs ya migradas al nuevo dominio =====
SELECT 'ARTICULOS_CMS.URL_IMAGEN' AS k, COUNT(*) AS n FROM ARTICULOS_CMS WHERE URL_IMAGEN LIKE '%pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev%';
SELECT 'ARTICULOS_CMS.CONTENIDO' AS k, COUNT(*) AS n FROM ARTICULOS_CMS WHERE CONTENIDO LIKE '%pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev%';
SELECT 'ARTICULOS_ORIGINALES.URL_IMAGEN' AS k, COUNT(*) AS n FROM ARTICULOS_ORIGINALES WHERE URL_IMAGEN LIKE '%pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev%';
SELECT 'ARTICULOS_ORIGINALES.URL_IMAGEN2' AS k, COUNT(*) AS n FROM ARTICULOS_ORIGINALES WHERE URL_IMAGEN2 LIKE '%pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev%';
SELECT 'ARTICULOS_PARAFRASEADOS.URL_IMAGEN' AS k, COUNT(*) AS n FROM ARTICULOS_PARAFRASEADOS WHERE URL_IMAGEN LIKE '%pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev%';
SELECT 'ARTICULOS_PARAFRASEADOS.CONTENIDO' AS k, COUNT(*) AS n FROM ARTICULOS_PARAFRASEADOS WHERE CONTENIDO LIKE '%pub-42bf42f47f554f9791e810e7d0f209d4.r2.dev%';
