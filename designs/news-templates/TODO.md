# TODO - Normalización de plantillas NexoPress

## ✅ Completado (Sprint 1)

- [x] Eliminar `news-category.lib.pen` (archivo roto/vacío)
- [x] Corregir propiedades CSS inválidas en `news-article.pen`:
  - [x] `"padding": "16 24"` → `paddingVertical/paddingHorizontal`
  - [x] `"borderLeft": "4px solid #00d4aa"` → remover (reemplazar con `paddingLeft`)
  - [x] `"fontStyle": "italic"` → remover
  - [x] `"marginTop": 8` → remover (usar `gap` en padre)
  - [x] Unificar `padding` en tags
- [x] Prefijar IDs en ambas plantillas:
  - [x] **news-homepage.pen**: `header` → `hp-header`, etc. (20 IDs)
  - [x] **news-article.pen**: `header` → `art-header`, etc. (12 IDs)
- [x] Agregar sección `components` en `news-article.pen` (ArticleCard, TickerItem, Header, Footer)

## ✅ Completado (Sprint 2)

- [x] **Etapa A — Higiene de propiedades**: Corrección de keys inválidas (`background:`, `textColor:`)
- [x] **Etapa C — Componentización**: Formalización de 9 componentes reutilizables
  - [x] Content/Tag/Category, Form/Button/Primary, Form/Button/Outline
  - [x] Content/TickerItem, Content/WeatherWidget
  - [x] Content/ArticleCard/Vertical, Content/ArticleCard/Horizontal
  - [x] Layout/Header/Main, Layout/Footer/Main
- [x] **Etapa D — Naming y gobernanza**: Aplicar convención Dominio/Componente/Variante
- [x] **Etapa E — Verificación final**: Validar visualmente los 3 archivos
- [x] Crear `news-design-system.pen` desde cero (9 componentes)
- [x] Crear `news-homepage.pen` (hero + grid + footer)
- [x] Crear `news-article.pen` (breadcrumb + body + sidebar)
- [x] Agregar imágenes AI a placeholders en homepage y artículo
- [x] Verificación visual mediante screenshots (✅ PASÓ)
- [x] Implementar sistema de colores por categoría (Economía=#00d4aa, Política=#3d52d5, Tecnología=#4a90e2, Deportes=#e74c3c)

## ⚠️ Parcialmente Completado (Sprint 3)

- [x] **Etapa B — Tokenización**: Crear diccionario de design tokens
  - [x] Definir dictionary único de tokens (DESIGN_TOKENS.md)
  - [x] Agregar tabla de mapeo hex → token semántico
  - [x] Documentar tokens aplicados en componentes
  - [ ] Centralizar en sistema de variables Pencil (limitaciones técnicas detectadas)
  - [ ] Exportar tokens a CSS para implementación web
- [x] Crear pantalla de categoría (`news-category.pen`)
- [ ] Generar documentación de design tokens
- [ ] Optimizar bundle size de imágenes AI
- [ ] Validar accesibilidad (contrast, alt text para imágenes)
