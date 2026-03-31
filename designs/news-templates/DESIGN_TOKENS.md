# NexoPress Design Tokens — Sistema de Variables

> **Estado**: Documentado manualmente. Sistema de variables de Pencil tiene limitaciones técnicas.
> Los tokens están implementados en componentes, pendiente centralizar en sistema de variables nativo.

## Color Tokens

### Background
| Token | Hex Value | Usage |
|-------|-----------|-------|
| `color/background/primary` | `#1a1a2e` | Primary dark background (body) |
| `color/background/secondary` | `#0d1626` | Dark secondary surface |
| `color/background/tertiary` | `#16213e` | Dark tertiary surface |
| `color/background/light` | `#f5f5f5` | Light content area |

### Text
| Token | Hex Value | Usage |
|-------|-----------|-------|
| `color/text/primary` | `#1a1a2e` | Primary text on light backgrounds |
| `color/text/secondary` | `#666666` | Secondary/muted text |
| `color/text/muted` | `#999999` | Tertiary muted text |
| `color/text/inverse` | `#ffffff` | Text on dark backgrounds |

### Borders & Accents
| Token | Hex Value | Usage |
|-------|-----------|-------|
| `color/border/default` | `#e0e0e0` | Default border color |
| `color/border/dark` | `#222222` | Dark border (on secondary bg) |
| `color/border/accent` | `#00d4aa` | Accent border (teal) |
| `color/accent/primary` | `#00d4aa` | Primary accent (teal) |

### Category Colors
| Category | Hex Value | Usage |
|----------|-----------|-------|
| **Economía** | `#00d4aa` | Economics category badge |
| **Política** | `#3d52d5` | Politics category badge |
| **Tecnología** | `#4a90e2` | Technology category badge |
| **Deportes** | `#e74c3c` | Sports category badge |

## Typography Tokens

### Font Families
| Token | Value | Usage |
|-------|-------|-------|
| `typography/family/display` | Playfair Display | Headlines, display text |
| `typography/family/body` | Inter | Body text, UI labels |

### Font Sizes
| Token | Value | Usage |
|-------|-------|-------|
| `typography/size/hero` | 56px | Hero/main title |
| `typography/size/headline` | 32px | Section headlines |
| `typography/size/subheading` | 20px | Subheadings |
| `typography/size/body` | 17px | Body text, article content |
| `typography/size/body-sm` | 14px | Meta text, captions |
| `typography/size/caption` | 12px | Small text, timestamps |

### Font Weights
| Token | Value | Usage |
|-------|-------|-------|
| `typography/weight/light` | 300 | Light text (rarely used) |
| `typography/weight/regular` | 400 | Regular body text |
| `typography/weight/semibold` | 600 | Semi-bold (card titles) |
| `typography/weight/bold` | 700 | Bold (headlines) |

## Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `spacing/xs` | 4px | Minimal spacing |
| `spacing/sm` | 8px | Small spacing |
| `spacing/md` | 12px | Medium spacing |
| `spacing/lg` | 16px | Standard padding |
| `spacing/xl` | 24px | Large spacing |
| `spacing/2xl` | 32px | Extra large |
| `spacing/3xl` | 48px | Xxl section spacing |
| `spacing/gutter` | 24px | Gap between grid items |
| `spacing/margin-main` | 80px | Main horizontal margins |

## Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `radius/sm` | 4px | Small radius (buttons, inputs) |
| `radius/md` | 6px | Medium radius |
| `radius/lg` | 8px | Card radius |
| `radius/full` | 999px | Fully rounded (pills, badges) |

## Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `shadow/sm` | blur: 4px, y-offset: 1px | Subtle elevation |
| `shadow/md` | blur: 8px, y-offset: 2px | Standard card shadow |
| `shadow/lg` | blur: 10px, y-offset: 2px | Strong elevation |

## Grid & Layout

| Token | Value | Usage |
|-------|-------|-------|
| Canvas Width | 1440px | Desktop canvas |
| Content Width | 1280px | Main content area |
| Horizontal Margin | 80px | Left/right padding |
| Grid Columns | 12 | Column system |
| Grid Gap | 24px | Gap between columns |

## Implementation Status

✅ **Implemented in components**:
- All color tokens applied to frames/text
- All typography values in use
- All spacing values applied
- All radius values used

⏳ **Pending**:
- Centralize in Pencil variable system (technical limitations encountered)
- Create design tokens CSS export for web implementation
- Document Figma variable equivalents
