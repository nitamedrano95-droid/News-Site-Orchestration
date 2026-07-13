-- 005_unify_economia.sql
-- Unificar ECONOMÍA (con tilde) → ECONOMIA (sin tilde).
-- Solo afecta ARTICULOS_PARAFRASEADOS (ARTICULOS_CMS no tiene la inconsistencia).
--
-- Detectado 2026-07-13: 32 filas con 'ECONOMÍA' + 462 con 'ECONOMIA' en
-- ARTICULOS_PARAFRASEADOS donde ESTADO='PUBLICADO'. Cualquier UI/feed que
-- normalice por una sola variante los rompía arbitrariamente.
--
-- D1 vía CLI wrangler d1 execute --file rechaza BEGIN TRANSACTION.
-- Cada UPDATE es atómico individualmente.
--
-- Backup: backups/pre_normalize_nuevos3_2026-07-13.sql
-- Generado: 2026-07-13

UPDATE ARTICULOS_PARAFRASEADOS
SET CATEGORIA = 'ECONOMIA'
WHERE CATEGORIA = 'ECONOMÍA';
