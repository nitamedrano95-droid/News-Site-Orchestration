-- scripts/sites/sample-data/fake-articles.sql
-- Datos de prueba para validar el refactor de ARTICULOS_SITIO en staging.
-- NO EJECUTAR EN PRODUCCIÓN. Solo staging chispakimnueve.
--
-- Insertar 5 artículos de prueba en 5 sitios distintos. Cada uno tiene:
--   - 1 fila en ARTICULOS_PARAFRASEADOS (contenido editorial)
--   - 1 fila en ARTICULOS_SITIO (asignación al sitio específico, FK a SITIOS)
--
-- Limpieza (rollback):
--   DELETE FROM ARTICULOS_SITIO
--     WHERE ID_PARAFRASEADO IN (
--       SELECT ID FROM ARTICULOS_PARAFRASEADOS
--       WHERE SOURCE_URL LIKE 'https://test.nexopress.io/%'
--     );
--   DELETE FROM ARTICULOS_PARAFRASEADOS
--     WHERE SOURCE_URL LIKE 'https://test.nexopress.io/%';
--
-- Generado: 2026-06-10
-- Sitios usados: bitacorainformativa, contextomexicano, codigomexico,
--                cronicanacionalmx, diariodelarepublica (todos del rediseño
--                cms-nuevos4 — ver data/sites/cms-nuevos4/*.json)

-- ═══════════════════════════════════════════════════════════════════
-- Artículo 1: bitacorainformativa / NACIONAL
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO ARTICULOS_PARAFRASEADOS (
  ID, TITULO_PARAFRASEADO, SLUG, CONTENIDO, DESCRIPCION_PARAFRASEADA,
  CATEGORIA, AUTOR, FECHA_PUBLICACION, URL_IMAGEN, SOURCE_URL, ESTADO, SITIO_DESTINO
) VALUES (
  'test-art-001-bitacorainformativa',
  'Reforma judicial avanza en el Senado con apoyo mayoritario',
  'reforma-judicial-senado-apoyo-mayoritario',
  'La iniciativa de reforma al sistema de justicia federal obtuvo 68 votos a favor en la cámara alta, marcando un avance significativo en el proceso legislativo. Los cambios incluyen la creación de tribunales especializados en resolución alternativa de conflictos y la digitalización obligatoria de expedientes para 2027. Sectores empresariales han expresado cautela sobre los tiempos de implementación.',
  'La iniciativa obtuvo 68 votos a favor; incluye tribunales especializados y digitalización obligatoria de expedientes para 2027.',
  'NACIONAL',
  'Redacción Bitácora',
  datetime('now'),
  'https://uploads.sebastianvernis.space/auto/test-reforma-judicial.jpg',
  'https://test.nexopress.io/001-reforma-judicial',
  'PUBLICADO',
  'bitacorainformativa'
);

INSERT INTO ARTICULOS_SITIO (
  ID, SITIO_SLUG, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID
) VALUES (
  'test-sit-001-bitacorainformativa',
  'bitacorainformativa',
  'test-art-001-bitacorainformativa',
  datetime('now'),
  0, NULL, NULL
);

-- ═══════════════════════════════════════════════════════════════════
-- Artículo 2: contextomexicano / POLÍTICA
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO ARTICULOS_PARAFRASEADOS (
  ID, TITULO_PARAFRASEADO, SLUG, CONTENIDO, DESCRIPCION_PARAFRASEADA,
  CATEGORIA, AUTOR, FECHA_PUBLICACION, URL_IMAGEN, SOURCE_URL, ESTADO, SITIO_DESTINO
) VALUES (
  'test-art-002-contextomexicano',
  'Sheinbaum se reúne con gobernadores del Bajío para revisar agenda hídrica',
  'sheinbaum-gobernadores-bajio-agenda-hidrica',
  'La presidenta Claudia Sheinbaum sostuvo un encuentro privado con los mandatarios estatales de Guanajuato, Querétaro, Aguascalientes y San Luis Potosí para coordinar la estrategia nacional de distribución de agua en las zonas industriales del centro del país. El acuerdo incluye la creación de un fondo conjunto de 8 mil millones de pesos para infraestructura hidráulica durante el primer semestre de 2026.',
  'Reunión privada con 4 gobernadores del Bajío; fondo de 8 mil mdp para infraestructura hidráulica en 2026.',
  'POLITICA',
  'Redacción Contexto',
  datetime('now'),
  'https://uploads.sebastianvernis.space/auto/test-sheinbaum-bajio.jpg',
  'https://test.nexopress.io/002-sheinbaum-bajio',
  'PUBLICADO',
  'contextomexicano'
);

INSERT INTO ARTICULOS_SITIO (
  ID, SITIO_SLUG, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID
) VALUES (
  'test-sit-002-contextomexicano',
  'contextomexicano',
  'test-art-002-contextomexicano',
  datetime('now'),
  0, NULL, NULL
);

-- ═══════════════════════════════════════════════════════════════════
-- Artículo 3: codigomexico / ECONOMÍA
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO ARTICULOS_PARAFRASEADOS (
  ID, TITULO_PARAFRASEADO, SLUG, CONTENIDO, DESCRIPCION_PARAFRASEADA,
  CATEGORIA, AUTOR, FECHA_PUBLICACION, URL_IMAGEN, SOURCE_URL, ESTADO, SITIO_DESTINO
) VALUES (
  'test-art-003-codigomexico',
  'Banxico mantiene tasa en 8% pese a presiones inflacionarias',
  'banxico-mantiene-tasa-8-porciento',
  'La Junta de Gobierno del Banco de México decidió por unanimidad mantener la tasa de interés de referencia en 8 por ciento, en línea con lo esperado por el mercado. El comunicado destaca que la inflación general anual se ubica en 4.2 por ciento, aún fuera del rango objetivo de 3 por ciento, pero con tendencia descendente. Analistas prevén un posible recorte en el segundo trimestre del año.',
  'Tasa se mantiene en 8%; inflación en 4.2% con tendencia a la baja. Posible recorte en Q2.',
  'ECONOMIA',
  'Redacción Código',
  datetime('now'),
  'https://uploads.sebastianvernis.space/auto/test-banxico-tasa.jpg',
  'https://test.nexopress.io/003-banxico-tasa',
  'PUBLICADO',
  'codigomexico'
);

INSERT INTO ARTICULOS_SITIO (
  ID, SITIO_SLUG, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID
) VALUES (
  'test-sit-003-codigomexico',
  'codigomexico',
  'test-art-003-codigomexico',
  datetime('now'),
  0, NULL, NULL
);

-- ═══════════════════════════════════════════════════════════════════
-- Artículo 4: cronicanacionalmx / SEGURIDAD
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO ARTICULOS_PARAFRASEADOS (
  ID, TITULO_PARAFRASEADO, SLUG, CONTENIDO, DESCRIPCION_PARAFRASEADA,
  CATEGORIA, AUTOR, FECHA_PUBLICACION, URL_IMAGEN, SOURCE_URL, ESTADO, SITIO_DESTINO
) VALUES (
  'test-art-004-cronicanacionalmx',
  'Operativo en Sinaloa deja 12 detenidos por tráfico de fentanilo',
  'operativo-sinaloa-12-detenidos-fentanilo',
  'La Secretaría de Seguridad federal informó sobre un operativo conjunto con la Guardia Nacional en el municipio de Culiacán que resultó en la detención de 12 personas vinculadas a una red de tráfico de fentanilo. Se decomisaron 45 kilos de la sustancia, tres laboratorios clandestinos y 8 armas de fuego. La investigación sigue abierta para identificar al líder de la célula criminal.',
  '12 detenidos en Culiacán; decomisan 45 kg de fentanilo, 3 laboratorios y 8 armas.',
  'SEGURIDAD',
  'Redacción Crónica',
  datetime('now'),
  'https://uploads.sebastianvernis.space/auto/test-operativo-sinaloa.jpg',
  'https://test.nexopress.io/004-operativo-sinaloa',
  'PUBLICADO',
  'cronicanacionalmx'
);

INSERT INTO ARTICULOS_SITIO (
  ID, SITIO_SLUG, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID
) VALUES (
  'test-sit-004-cronicanacionalmx',
  'cronicanacionalmx',
  'test-art-004-cronicanacionalmx',
  datetime('now'),
  0, NULL, NULL
);

-- ═══════════════════════════════════════════════════════════════════
-- Artículo 5: diariodelarepublica / INTERNACIONAL
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO ARTICULOS_PARAFRASEADOS (
  ID, TITULO_PARAFRASEADO, SLUG, CONTENIDO, DESCRIPCION_PARAFRASEADA,
  CATEGORIA, AUTOR, FECHA_PUBLICACION, URL_IMAGEN, SOURCE_URL, ESTADO, SITIO_DESTINO
) VALUES (
  'test-art-005-diariodelarepublica',
  'T-MEC: inician renegociaciones trilaterales en Washington',
  'tmec-renegociaciones-trilaterales-washington',
  'Representantes comerciales de México, Estados Unidos y Canadá se reúnen esta semana en la capital estadounidense para iniciar la revisión programada del Tratado entre México, Estados Unidos y Canadá. Los temas centrales incluyen reglas de origen para vehículos eléctricos, migración laboral y mecanismos de solución de controversias. Se espera que las negociaciones se extiendan durante todo 2026.',
  'Arranca revisión del T-MEC en Washington; temas: vehículos eléctricos, migración laboral y controversias.',
  'INTERNACIONAL',
  'Redacción Diario',
  datetime('now'),
  'https://uploads.sebastianvernis.space/auto/test-tmec-washington.jpg',
  'https://test.nexopress.io/005-tmec-washington',
  'PUBLICADO',
  'diariodelarepublica'
);

INSERT INTO ARTICULOS_SITIO (
  ID, SITIO_SLUG, ID_PARAFRASEADO, FECHA_ASIGNACION, FB_PUBLICADO, FB_FECHA, FB_POST_ID
) VALUES (
  'test-sit-005-diariodelarepublica',
  'diariodelarepublica',
  'test-art-005-diariodelarepublica',
  datetime('now'),
  0, NULL, NULL
);

-- ═══════════════════════════════════════════════════════════════════
-- Verificación post-insert (puede comentarse si no querés output)
-- ═══════════════════════════════════════════════════════════════════
-- SELECT 'PARAFRASEADOS' as tabla, COUNT(*) as total FROM ARTICULOS_PARAFRASEADOS WHERE SOURCE_URL LIKE 'https://test.nexopress.io/%';
-- SELECT 'SITIO' as tabla, SITIO_SLUG, COUNT(*) as total FROM ARTICULOS_SITIO WHERE ID_PARAFRASEADO LIKE 'test-art-%' GROUP BY SITIO_SLUG ORDER BY SITIO_SLUG;
