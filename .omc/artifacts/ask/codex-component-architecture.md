# Codex Analysis: NexoPress Component Architecture

## Component Dependency Order
1. `Tag/Category`
2. `Button/Primary`
3. `Button/Outline`
4. `ArticleCard/Vertical`
5. `ArticleCard/Horizontal`
6. `TickerItem`
7. `WeatherWidget`
8. `Header`
9. `Footer`

## Layout Specifications (1440px canvas)
- Canvas: `1440px`
- Content max-width: `1280px`
- Grid: `12 columns`
- Gutter: `24px`
- Outer margin: `80px`

## Component Dimensions
- `Tag/Category`: `28px` alto, `padding [12, 6]`, `radius 999px`
- `Button`: `40px / 44px / 48px` alto para `sm/md/lg`
- `ArticleCard/Vertical`: `302–410px` ancho, `420–520px` alto
- `ArticleCard/Horizontal`: `628px` ancho, `180–220px` alto
- `Header`: `112–136px` alto
- `Footer`: `280–360px` alto

## Recommended Props Contract
Each component should support:
- `variant`: style variations
- `size`: dimensional scales
- `state`: interactive states (default, hover, active, disabled)
- Content slots for text, images, icons
