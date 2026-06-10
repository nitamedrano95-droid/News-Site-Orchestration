# 📋 Corrección de Artículos - D1

## Resumen del Diagnóstico

Se verificaron **593 artículos** en la base de datos `news_db_cms_nuevos2` y se encontraron los siguientes problemas:

| Problema | Cantidad | Prioridad |
|----------|----------|-----------|
| ❌ Sin descripción | 4 | Crítica |
| ❌ Títulos muy cortos (<10 chars) | 4 | Crítica |
| ⚠️ Títulos muy largos (>100 chars) | 33 | Media |
| ⚠️ Espacios dobles | 61 | Media |
| ⚠️ Descripciones truncadas (...) | 13 | Media |
| ⚠️ Separadores "//" sin editar | 25 | Media |
| ⚠️ URLs en descripciones | 1 | Baja |

---

## 📁 Archivos Creados

### 1. `fix_articles_format.sql`
Script SQL automático que corrige:
- ✅ Espacios dobles en títulos y descripciones
- ✅ URLs (http, https, bit.ly) en descripciones
- ✅ Separadores "//" y texto posterior
- ✅ Puntos suspensivos "..." al final
- ✅ Títulos genéricos "Dinero" y "Libris"
- ✅ Espacios en blanco al inicio/final
- ✅ Saltos de línea múltiples

### 2. `review_manual.sql`
Script SQL para revisión manual que:
- 📝 Identifica artículos sin descripción
- 📝 Propone descripciones para 4 artículos críticos
- 📝 Lista títulos largos con sugerencias de acortamiento
- 📝 Incluye consulta de verificación post-corrección

### 3. `apply_corrections.sh`
Script bash interactivo con opciones:
- `--dry-run` - Solo mostrar información (sin cambios)
- `--apply` - Aplicar correcciones con backup automático
- `--backup` - Solo crear backup
- `--verify` - Verificar estado actual
- `--help` - Mostrar ayuda

---

## 🚀 Cómo Usar

### Paso 1: Verificar estado actual (RECOMENDADO)

```bash
cd /home/sebastianvernis/ProyectosActivos/cloudflare-news-project/cms-nuevos2

# Ver estado actual sin hacer cambios
./scripts/correction/apply_corrections.sh --verify
```

### Paso 2: Ejecutar en modo dry-run

```bash
# Ver qué cambios se harían sin aplicar
./scripts/correction/apply_corrections.sh --dry-run
```

### Paso 3: Aplicar correcciones automáticas

```bash
# Aplicar todas las correcciones (crea backup primero)
./scripts/correction/apply_corrections.sh --apply
```

### Paso 4: Revisión manual (si es necesario)

```bash
# Ejecutar consultas de revisión manual en D1
npx wrangler d1 execute news_db_cms_nuevos2 --remote --file ./scripts/correction/review_manual.sql
```

---

## 📊 Ejecutar Scripts SQL Directamente

### Solo correcciones automáticas:

```bash
npx wrangler d1 execute news_db_cms_nuevos2 --remote --file ./scripts/correction/fix_articles_format.sql
```

### Solo revisión manual:

```bash
npx wrangler d1 execute news_db_cms_nuevos2 --remote --file ./scripts/correction/review_manual.sql
```

---

## 🔍 Detalles de las Correcciones

### Artículos Sin Descripción (4)

| ID | Título | Descripción Propuesta |
|----|--------|----------------------|
| 3868a8d6-ff2e-45a3-afef-8f9931a6696c | Transportistas de Guerrero... | Transportistas de Guerrero se suman a la ANTAC... |
| 94ff2c91-63b6-45d4-800b-0362499c937d | Dos sacerdotes, una cita... | Norma Otilia Hernández rompe el silencio... |
| a5fdf6b8-b6f6-42c6-adec-d738d18cd41f | Testigos presenciales... | Testigos confirman presencia de sacerdote... |
| 84b2c602-b960-4eb8-975d-69579ae18681 | Mil días de pedir #JusticiaParaThalía | Se cumplen mil días desde el asesinato de Thalía... |

### Títulos Cortos a Corregir (4)

| Título Original | Nuevo Título |
|-----------------|--------------|
| Dinero | Reporte Especial: Dinero y Finanzas |
| Dinero | Análisis Financiero |
| Libris | Feria del Libro Libris |
| Libris | Feria del Libro Libris |

### Ejemplos de Títulos Largos a Acortar

| Longitud | Título Original | Título Sugerido |
|----------|-----------------|-----------------|
| 138 chars | Este auto eléctrico cuesta 122,000 pesos porque no incluye batería... | Auto eléctrico sin batería cuesta 122,000 pesos. ¿Sería un éxito en México? |
| 127 chars | La misteriosa vida de B. Traven, el autor alemán de múltiples seudónimos... | La misteriosa vida de B. Traven, autor alemán que inspiró un clásico de Hollywood |
| 125 chars | Este monstruoso juego tiene tantas mecánicas que lo hacen especial... | Este juego tiene mecánicas increíbles, pero los jugadores se quejan de esto |

---

## ⚠️ Consideraciones Importantes

1. **Backup automático**: El script `--apply` crea un backup antes de modificar
2. **Espacios dobles**: Algunas correcciones pueden requerir múltiples pasadas
3. **Títulos largos**: Las sugerencias son propuestas, revisar caso por caso
4. **Descripciones truncadas**: Requieren revisión editorial del contenido original

---

## 📈 Verificación Post-Corrección

Después de aplicar las correcciones, ejecuta:

```bash
# Verificar resultados
npx wrangler d1 execute news_db_cms_nuevos2 --remote --command "
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN DESCRIPCION_PARAFRASEADA IS NULL OR DESCRIPCION_PARAFRASEADA = '' THEN 1 ELSE 0 END) as sin_descripcion,
  SUM(CASE WHEN LENGTH(TITULO_PARAFRASEADO) < 10 THEN 1 ELSE 0 END) as titulos_cortos,
  SUM(CASE WHEN LENGTH(TITULO_PARAFRASEADO) > 100 THEN 1 ELSE 0 END) as titulos_largos,
  SUM(CASE WHEN TITULO_PARAFRASEADO LIKE '%  %' OR DESCRIPCION_PARAFRASEADA LIKE '%  %' THEN 1 ELSE 0 END) as espacios_dobles
FROM ARTICULOS_PARAFRASEADOS;
"
```

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de wrangler en `~/.config/.wrangler/logs/`
2. Verifica que tengas acceso remoto a la base de datos D1
3. Asegúrate de tener la última versión de wrangler: `npm install -g wrangler`

---

**Fecha de creación**: 2026-03-27  
**Base de datos**: news_db_cms_nuevos2 (e3d0d028-fd76-4d7e-ae02-d2a928692bb8)  
**Total de artículos**: 593
