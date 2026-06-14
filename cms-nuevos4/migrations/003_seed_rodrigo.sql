-- seed_rodrigo.sql — Add Rodrigo as editor in this CMS.
-- Idempotent: INSERT OR IGNORE.

INSERT OR IGNORE INTO USUARIOS (NOMBRE, EMAIL, ROL, ACTIVO)
VALUES ('Rodrigo', 'rodrigo91230@gmail.com', 'editor', 1);
