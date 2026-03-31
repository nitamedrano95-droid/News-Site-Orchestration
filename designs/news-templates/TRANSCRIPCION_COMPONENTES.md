# Transcripción efectiva de plantillas NexoPress para Pencil / Figma / Stitch

## 1) Objetivo

Este documento traduce las plantillas actuales (`news-design-system.pen`, `news-homepage.pen`, `news-article.pen`) a una guía operativa para reutilizar sus componentes en **Pencil**, **Figma** y **Stitch**, con:

- Inventario de componentes reutilizables
- Tokens de diseño normalizados
- Variantes y props por componente
- Guía de construcción por pantalla
- Observaciones de normalización para evitar errores de implementación

## 2) Archivos fuente analizados

- `news-design-system.pen` (base del sistema de diseño)
- `news-homepage.pen` (plantilla de portada)
- `news-article.pen` (plantilla de artículo)
- `news-category.lib.pen` (actualmente vacío)

## 3) Inventario de componentes reutilizables

### Núcleo de layout
1. **Header (Site Header)**
2. **Footer (Site Footer)**

### Contenido editorial
3. **ArticleCard**
4. **ArticleCardHorizontal**
5. **TickerItem**
6. **WeatherWidget**

### UI controls
7. **Button** (`primary`, `secondary`, `outline`, `ghost`)
8. **Tag / Badge** (`category`, `pill`, `ticker`)
9. **Input Field** (`text`, `search`)

## 4) Tokens de diseño (normalizados)

### Colores
- `color.primary.dark` = `#1a1a2e`
- `color.primary.mid` = `#16213e`
- `color.accent.main` = `#00d4aa`
- `color.accent.red` = `#e74c3c`
- `color.accent.blue` = `#3498db`
- `color.accent.green` = `#27ae60`
- `color.accent.yellow` = `#f39c12`
- `color.bg.default` = `#f5f5f5`
- `color.surface.default` = `#ffffff`
- `color.text.primary` = `#1a1a2e`
- `color.text.secondary` = `#666666`
- `color.text.muted` = `#999999`
- `color.border.default` = `#e0e0e0`

### Tipografía
- `font.display` = `Playfair Display`
- `font.body` = `Source Sans Pro`
- `font.mono` = `JetBrains Mono`

### Espaciado
- `space.xs` = 4
- `space.sm` = 8
- `space.md` = 16
- `space.lg` = 24
- `space.xl` = 32
- `space.xxl` = 48

### Radius
- `radius.sm` = 4
- `radius.md` = 8
- `radius.lg` = 12
- `radius.full` = 9999

### Sombras
- `shadow.sm` = `0 2px 10px rgba(0,0,0,0.08)`
- `shadow.md` = `0 4px 20px rgba(0,0,0,0.1)`
- `shadow.lg` = `0 8px 30px rgba(0,0,0,0.12)`

## 5) Mapeo por herramienta

### Figma
- Variables por colección: Color, Typography, Spacing, Radius, Shadow
- Componentes con Auto Layout y variantes
- Props para texto, booleans y variants

### Pencil
- Reutilizar `pages` y `children` con IDs estables
- Consolidar librería de componentes base
- Referenciar variables desde design-system

### Stitch
- Contratos de props por componente
- Estilos ligados a tokens (no hex hardcodeado)
- Composición por slots (header, cards, widgets)

## 6) Contrato unificado de props (resumen)

- `Header({ logo, siteName, categories, showSearch })`
- `Footer({ logo, description, sections, legal, social })`
- `ArticleCard({ image, category, title, date, author?, variant })`
- `ArticleCardHorizontal({ image, category, title, date })`
- `Button({ label, variant, size, state })`
- `Tag({ label, variant })`
- `Input({ placeholder, type, icon?, state })`
- `TickerItem({ label, value, change, positive })`
- `WeatherWidget({ city, temp, condition, high, low })`

## 7) Blueprint por pantalla

### Homepage
1. Header
2. Hero (FeaturedArticle + SidebarTicker)
3. LatestNews (SectionHeader + Grid de ArticleCards)
4. Footer

### Article
1. Header
2. Breadcrumb
3. Main (ArticleContent + Sidebar)
4. Footer

## 8) Inconsistencias detectadas y normalización

Se detectaron claves con typo en `news-design-system.pen`:
- `background:` ➜ debe ser `background`
- `textColor:` ➜ debe ser `textColor`

Recomendación:
1. Normalizar propiedades inválidas
2. Consolidar dictionary de tokens único
3. Reemplazar hex directos por tokens semánticos
4. Unificar convención de naming

## 9) Checklist de normalización ejecutable (aplicable a `.pen`)

### 9.1 Propiedades inválidas: reglas directas de corrección

Aplicar búsqueda y reemplazo global controlado:

- `"background:"` ➜ `"background"`
- `"textColor:"` ➜ `"textColor"`

Regla general:
- Toda key de estilo debe ir sin `:` dentro del nombre de la propiedad.
- Validar consistencia en: `background`, `textColor`, `padding`, `cornerRadius`, `shadow`, `stroke`, `lineHeight`.

### 9.2 Validaciones mínimas después de corregir keys

- No deben existir coincidencias de regex: `"(background:|textColor:)"`.
- Todas las entradas de color deben estar en formato hex válido o referencia token.
- No mezclar `fontWeight` numérico/string de forma inconsistente en un mismo componente (definir estándar).

## 10) Dictionary único de tokens (Single Source of Truth)

Este bloque debe considerarse la fuente canónica para Figma/Pencil/Stitch.

```json
{
  "tokens": {
    "color": {
      "primary": {
        "dark": "#1a1a2e",
        "mid": "#16213e"
      },
      "accent": {
        "main": "#00d4aa",
        "red": "#e74c3c",
        "blue": "#3498db",
        "green": "#27ae60",
        "yellow": "#f39c12"
      },
      "surface": {
        "background": "#f5f5f5",
        "default": "#ffffff"
      },
      "text": {
        "primary": "#1a1a2e",
        "secondary": "#666666",
        "muted": "#999999",
        "inverse": "#ffffff"
      },
      "border": {
        "default": "#e0e0e0"
      },
      "state": {
        "success": "#27ae60",
        "warning": "#f39c12",
        "error": "#e74c3c",
        "info": "#3498db"
      }
    },
    "typography": {
      "fontFamily": {
        "display": "Playfair Display",
        "body": "Source Sans Pro",
        "mono": "JetBrains Mono"
      },
      "fontSize": {
        "hero": 48,
        "title": 32,
        "subtitle": 24,
        "lead": 18,
        "body": 16,
        "secondary": 14,
        "meta": 12,
        "micro": 10
      },
      "lineHeight": {
        "tight": 1.3,
        "normal": 1.5,
        "relaxed": 1.8
      },
      "fontWeight": {
        "regular": 400,
        "semibold": 600,
        "bold": 700
      }
    },
    "space": {
      "xs": 4,
      "sm": 8,
      "md": 16,
      "lg": 24,
      "xl": 32,
      "xxl": 48
    },
    "radius": {
      "sm": 4,
      "md": 8,
      "lg": 12,
      "full": 9999
    },
    "shadow": {
      "sm": "0 2px 10px rgba(0,0,0,0.08)",
      "md": "0 4px 20px rgba(0,0,0,0.1)",
      "lg": "0 8px 30px rgba(0,0,0,0.12)"
    }
  }
}
```

## 11) Tabla de migración: hex directo ➜ token semántico

| Hex actual | Token semántico destino |
|---|---|
| `#1a1a2e` | `color.primary.dark` / `color.text.primary` |
| `#16213e` | `color.primary.mid` |
| `#00d4aa` | `color.accent.main` |
| `#e74c3c` | `color.accent.red` / `color.state.error` |
| `#3498db` | `color.accent.blue` / `color.state.info` |
| `#27ae60` | `color.accent.green` / `color.state.success` |
| `#f39c12` | `color.accent.yellow` / `color.state.warning` |
| `#f5f5f5` | `color.surface.background` |
| `#ffffff` | `color.surface.default` / `color.text.inverse` |
| `#666666` | `color.text.secondary` |
| `#999999` | `color.text.muted` |
| `#e0e0e0` | `color.border.default` |

Regla:
- Si un color cumple doble propósito, usar el token semántico según contexto (`text`, `state`, `surface`, etc.).

## 12) Convención unificada de naming

### 12.1 Tokens
- Formato: `categoria.subcategoria.valor`
- Ejemplos válidos:
  - `color.text.primary`
  - `space.md`
  - `radius.lg`
- Inválido:
  - `primary-dark` aislado sin namespace
  - `TextColorMain` (camelCase inconsistente)

### 12.2 Componentes
- Formato: `Dominio/Componente/Variante`
- Ejemplos:
  - `Layout/Header/Main`
  - `Content/ArticleCard/Vertical`
  - `Form/Button/Primary`

### 12.3 Variantes y props
- `variant`: `primary | secondary | outline | ghost`
- `size`: `sm | md | lg`
- `state`: `default | hover | focus | disabled | error`

Props en `camelCase`:
- `showSearch`, `readTime`, `publishedAt`, `isPositive`

### 12.4 IDs internos en `.pen`
- Formato recomendado: `bloque-elemento-subelemento`
- Ejemplos:
  - `header-nav-item-economia`
  - `article-card-title`
  - `ticker-item-change`
- Evitar IDs ambiguos:
  - `logo`, `title`, `content` sin prefijo de contexto.

## 13) Flujo de migración por etapas

1. **Etapa A — Higiene de propiedades**
   - Corregir keys inválidas (`background:`, `textColor:`).
   - Verificar JSON válido.

2. **Etapa B — Tokenización**
   - Reemplazar hex directos por tokens semánticos.
   - Consolidar todas las variables en un solo dictionary canónico.

3. **Etapa C — Componentización**
   - Promover bloques repetidos a componentes formales (Header, Footer, Card, Tag, Button, etc.).
   - Definir variantes y props en contrato único.

4. **Etapa D — Naming y gobernanza**
   - Aplicar convención única de nombres (tokens/componentes/ids/props).
   - Registrar guía de estilo para nuevas plantillas.

5. **Etapa E — Verificación final**
   - Revisar que no queden hex hardcodeados fuera de tokens.
   - Revisar que no queden keys inválidas.
   - Confirmar consistencia visual entre Homepage, Article y Design System.

## 14) Resultado esperado tras esta transcripción

Con esta versión ya tienes una base directa para:
- crear librería de componentes en Figma,
- mantener consistencia estructural en Pencil,
- preparar handoff robusto en Stitch,
- y ejecutar una migración controlada hacia un sistema de diseño escalable y mantenible.
