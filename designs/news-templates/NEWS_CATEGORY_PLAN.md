# Plan de Ejecución: news-category.pen

> **Para agente entrante**: Ejecuta este plan en orden estricto.
> Usa SOLO las herramientas MCP de Pencil (`mcp__pencil__*`).
> El archivo `.pen` es encriptado — NUNCA uses Read/Write/Edit sobre él.

---

## Estado del proyecto

- **Sprint 2-3 completados** ✅
- 3 archivos .pen existentes: `news-design-system.pen`, `news-homepage.pen`, `news-article.pen`
- **Tarea pendiente**: Crear `news-category.pen` desde cero
- Commit actual: `045c710`

---

## Tokens de referencia (DESIGN_TOKENS.md)

```
Canvas: 1440px, margin horizontal: 80px
Colors:
  background primary:   #1a1a2e  (dark)
  background secondary: #0d1626  (más oscuro)
  background light:     #f5f5f5  (contenido)
  text primary:         #1a1a2e
  text secondary:       #666666
  text inverse:         #ffffff
  accent:               #00d4aa  (teal)
  border:               #e0e0e0
  border dark:          #222222

Categorías:
  Economía:   #00d4aa
  Política:   #3d52d5
  Tecnología: #4a90e2
  Deportes:   #e74c3c

Tipografía:
  display: "Playfair Display"
  body:    "Inter"

Spacing: xs=4, sm=8, md=12, lg=16, xl=24, 2xl=32, 3xl=48
Radius:  sm=4, md=6, lg=8, full=999
```

---

## Paso 0: Abrir el archivo (OBLIGATORIO primero)

```js
open_document("new")
// Pencil creará un archivo nuevo
// Luego renombrar guardando como news-category.pen
```

O abrir directamente:
```js
open_document("/home/sebastianvernis/ProyectosActivos/cloudflare-news-project/designs/news-templates/news-category.pen")
```

Verificar con `get_editor_state()` antes de cada batch.

---

## Batch 1 — Frame raíz + Header + Ticker + Breadcrumb (≈18 ops)

```js
// Frame raíz
I("root", {type:"frame", name:"NexoPress — Category", width:1440, layout:"vertical", fill:"#f5f5f5", x:0, y:0})

// === HEADER ===
I("catPage", {type:"frame", name:"header", width:"fill_container", layout:"vertical", fill:"#1a1a2e"})

// Header top bar (logo + nav + actions)
I("header", {type:"frame", name:"headerTop", width:"fill_container", height:64, alignItems:"center", justifyContent:"space_between", padding:[0,80], fill:"#1a1a2e"})
I("headerTop", {type:"text", name:"hLogo", content:"NexoPress", fill:"#00d4aa", fontFamily:"Playfair Display", fontSize:26, fontWeight:"700"})
I("headerTop", {type:"frame", name:"hNav", alignItems:"center", gap:28})
I("hNav", {type:"text", name:"hNav1", content:"Economía", fill:"#ffffff", fontFamily:"Inter", fontSize:14})
I("hNav", {type:"text", name:"hNav2", content:"Política", fill:"#ffffff", fontFamily:"Inter", fontSize:14})
I("hNav", {type:"text", name:"hNav3", content:"Tecnología", fill:"#ffffff", fontFamily:"Inter", fontSize:14})
I("hNav", {type:"text", name:"hNav4", content:"Deportes", fill:"#00d4aa", fontFamily:"Inter", fontSize:14, fontWeight:"700"})

// Ticker bar
I("header", {type:"frame", name:"hTicker", width:"fill_container", height:38, alignItems:"center", fill:"#16213e", padding:[0,80], gap:20})
I("hTicker", {type:"text", name:"hTickerLbl", content:"MERCADOS", fill:"#00d4aa", fontFamily:"Inter", fontSize:11, fontWeight:"700"})
I("hTicker", {type:"frame", name:"hTickerDiv", width:1, height:18, fill:"#444444"})
I("hTicker", {type:"frame", name:"hT1", alignItems:"center", gap:5, fill:"#0d1626", cornerRadius:4, padding:[4,8]})
I("hT1", {type:"text", name:"hT1Sym", content:"BTC", fill:"#00d4aa", fontFamily:"Inter", fontSize:11, fontWeight:"700"})
I("hT1", {type:"text", name:"hT1Val", content:"$43,210", fill:"#ffffff", fontFamily:"Inter", fontSize:11})

// === BREADCRUMB ===
I("catPage", {type:"frame", name:"breadcrumb", width:"fill_container", height:44, alignItems:"center", fill:"#ffffff", padding:[0,80], gap:6, stroke:{align:"inside", fill:"#e0e0e0", thickness:{bottom:1}}})
I("breadcrumb", {type:"text", name:"bcHome", content:"Inicio", fill:"#666666", fontFamily:"Inter", fontSize:13})
I("breadcrumb", {type:"text", name:"bcSep", content:">", fill:"#999999", fontFamily:"Inter", fontSize:13})
I("breadcrumb", {type:"text", name:"bcCat", content:"Economía", fill:"#00d4aa", fontFamily:"Inter", fontSize:13, fontWeight:"600"})
```

---

## Batch 2 — Category Hero Banner (≈8 ops)

El elemento más importante y nuevo. Fondo con color de la categoría activa.

```js
// Hero banner (fondo color categoría)
I("catPage", {type:"frame", name:"catHero", width:"fill_container", height:200, layout:"vertical", justifyContent:"center", fill:"#00d4aa", padding:[0,80], gap:8})

I("catHero", {type:"frame", name:"catHeroBadge", alignItems:"center", justifyContent:"center", cornerRadius:999, fill:"rgba(0,0,0,0.15)", padding:[4,12]})
I("catHeroBadge", {type:"text", name:"catHeroBadgeLbl", content:"CATEGORÍA", fill:"#ffffff", fontFamily:"Inter", fontSize:10, fontWeight:"700"})

I("catHero", {type:"text", name:"catHeroTitle", content:"Economía", fill:"#ffffff", fontFamily:"Playfair Display", fontSize:48, fontWeight:"700"})
I("catHero", {type:"text", name:"catHeroDesc", content:"Noticias de finanzas, mercados y negocios globales", fill:"#ffffff", fontFamily:"Inter", fontSize:16, fontWeight:"400"})
I("catHero", {type:"text", name:"catHeroMeta", content:"245 artículos · Actualizado hace 5 min", fill:"#ffffff", fontFamily:"Inter", fontSize:12})
```

---

## Batch 3 — Filter Bar (≈7 ops)

```js
I("catPage", {type:"frame", name:"filterBar", width:"fill_container", height:56, alignItems:"center", fill:"#ffffff", padding:[0,80], gap:12, stroke:{align:"inside", fill:"#e0e0e0", thickness:{bottom:1}}})

I("filterBar", {type:"text", name:"filterLabel", content:"Ordenar por:", fill:"#666666", fontFamily:"Inter", fontSize:13})

// Botón activo (teal)
I("filterBar", {type:"frame", name:"filterBtn1", alignItems:"center", justifyContent:"center", cornerRadius:6, fill:"#00d4aa", padding:[8,16], height:36})
I("filterBtn1", {type:"text", name:"filterBtn1Lbl", content:"Más reciente", fill:"#ffffff", fontFamily:"Inter", fontSize:13, fontWeight:"600"})

// Botón outline
I("filterBar", {type:"frame", name:"filterBtn2", alignItems:"center", justifyContent:"center", cornerRadius:6, fill:"transparent", padding:[8,16], height:36, stroke:{align:"inside", fill:"#e0e0e0", thickness:1}})
I("filterBtn2", {type:"text", name:"filterBtn2Lbl", content:"Más popular", fill:"#1a1a2e", fontFamily:"Inter", fontSize:13})

I("filterBar", {type:"frame", name:"filterBtn3", alignItems:"center", justifyContent:"center", cornerRadius:6, fill:"transparent", padding:[8,16], height:36, stroke:{align:"inside", fill:"#e0e0e0", thickness:1}})
I("filterBtn3", {type:"text", name:"filterBtn3Lbl", content:"Relevante", fill:"#1a1a2e", fontFamily:"Inter", fontSize:13})
```

---

## Batch 4 — Main Area: Featured + Grid + Sidebar (≈45 ops)

### Setup del main area (2-column layout)

```js
I("catPage", {type:"frame", name:"mainArea", width:"fill_container", fill:"#f5f5f5", padding:[48,80], gap:48, layout:"vertical"})

// Fila superior: Featured card
// Fila inferior: grid + sidebar en row
I("mainArea", {type:"frame", name:"contentRow", width:"fill_container", gap:24})
I("contentRow", {type:"frame", name:"articleColumn", width:"fill_container", layout:"vertical", gap:24})
I("contentRow", {type:"frame", name:"sidebar", width:320, layout:"vertical", gap:24})
```

### Featured Article (Horizontal Card)

```js
I("articleColumn", {type:"frame", name:"featuredCard", width:"fill_container", layout:"horizontal", fill:"#ffffff", cornerRadius:8, clip:true, effect:{type:"shadow", shadowType:"outer", color:"#00000012", blur:10, offset:{x:0,y:2}}})
I("featuredCard", {type:"frame", name:"featuredImg", width:320, height:200, fill:"#16213e"})
I("featuredCard", {type:"frame", name:"featuredBody", layout:"vertical", fill:"fill_container", padding:24, gap:12})
I("featuredBody", {type:"frame", name:"featuredTag", alignItems:"center", justifyContent:"center", cornerRadius:999, fill:"#00d4aa", padding:[4,10]})
I("featuredTag", {type:"text", name:"featuredTagLbl", content:"ECONOMÍA", fill:"#ffffff", fontFamily:"Inter", fontSize:10, fontWeight:"700"})
I("featuredBody", {type:"text", name:"featuredTitle", content:"La Reserva Federal mantiene tasas pese a presión inflacionaria en mercados globales", fill:"#1a1a2e", fontFamily:"Playfair Display", fontSize:22, fontWeight:"700", lineHeight:1.3, textGrowth:"fixed-width", width:"fill_container"})
I("featuredBody", {type:"text", name:"featuredExcerpt", content:"Los mercados reaccionaron con cautela ante el comunicado oficial del banco central americano...", fill:"#666666", fontFamily:"Inter", fontSize:14, lineHeight:1.5, textGrowth:"fixed-width", width:"fill_container"})
I("featuredBody", {type:"frame", name:"featuredMeta", alignItems:"center", gap:8})
I("featuredMeta", {type:"text", name:"featuredAuthor", content:"Carlos Méndez", fill:"#999999", fontFamily:"Inter", fontSize:12})
I("featuredMeta", {type:"text", name:"featuredDate", content:"· 30 Mar 2026", fill:"#999999", fontFamily:"Inter", fontSize:12})
```

### Article Grid (3-col × 3 rows = 9 cards)

```js
I("articleColumn", {type:"frame", name:"articleGrid", width:"fill_container", gap:24})

// Repetir 9 veces (card1..card9), aquí card1, card2, card3 como ejemplo:
I("articleGrid", {type:"frame", name:"card1", layout:"vertical", fill:"#ffffff", cornerRadius:8, clip:true, effect:{type:"shadow", shadowType:"outer", color:"#00000012", blur:8, offset:{x:0,y:2}}})
I("card1", {type:"frame", name:"card1Img", width:"fill_container", height:158, fill:"#d8d8d8"})
I("card1", {type:"frame", name:"card1Body", layout:"vertical", padding:16, gap:8})
I("card1Body", {type:"frame", name:"card1Tag", alignItems:"center", cornerRadius:999, fill:"#00d4aa", padding:[4,10]})
I("card1Tag", {type:"text", name:"card1TagLbl", content:"ECONOMÍA", fill:"#ffffff", fontFamily:"Inter", fontSize:9, fontWeight:"700"})
I("card1Body", {type:"text", name:"card1Title", content:"Mercados emergentes registran máximos históricos en primer trimestre", fill:"#1a1a2e", fontFamily:"Playfair Display", fontSize:15, fontWeight:"700", lineHeight:1.3, textGrowth:"fixed-width", width:"fill_container"})
I("card1Body", {type:"frame", name:"card1Meta", alignItems:"center", gap:6})
I("card1Meta", {type:"text", name:"card1Date", content:"30 Mar 2026", fill:"#999999", fontFamily:"Inter", fontSize:11})
I("card1Meta", {type:"text", name:"card1Read", content:"· 4 min", fill:"#999999", fontFamily:"Inter", fontSize:11})

// Repetir el mismo patrón para card2..card9 con títulos diferentes
// card2: "Bitcoin supera los $50,000 impulsado por ETFs institucionales"
// card3: "FMI revisa al alza proyecciones de crecimiento para Latinoamérica"
// card4: "Dólar cae frente a monedas emergentes tras datos de empleo en EEUU"
// card5: "Petróleo Brent alcanza máximos de 6 meses ante tensiones geopolíticas"
// card6: "Bolsa de Buenos Aires sube 3% liderada por sector energético"
// card7: "Tasas de interés en Europa podrían bajar antes de lo esperado"
// card8: "China anuncia paquete de estímulo fiscal de $500 mil millones"
// card9: "Inversión extranjera directa en México crece 15% interanual"
```

### Sidebar

```js
// Weather Widget
I("sidebar", {type:"frame", name:"weatherWidget", width:280, height:120, cornerRadius:8, fill:"#1a1a2e", padding:16, layout:"vertical", gap:4})
I("weatherWidget", {type:"text", name:"wCity", content:"Buenos Aires", fill:"#ffffff", fontFamily:"Inter", fontSize:13, fontWeight:"600"})
I("weatherWidget", {type:"text", name:"wTemp", content:"22°C", fill:"#00d4aa", fontFamily:"Playfair Display", fontSize:32, fontWeight:"700"})
I("weatherWidget", {type:"text", name:"wDesc", content:"Parcialmente nublado", fill:"#999999", fontFamily:"Inter", fontSize:12})

// Popular Tags widget
I("sidebar", {type:"frame", name:"popularTagsWidget", width:280, cornerRadius:8, fill:"#ffffff", padding:16, layout:"vertical", gap:12, stroke:{align:"inside", fill:"#e0e0e0", thickness:1}})
I("popularTagsWidget", {type:"text", name:"tagsWidgetTitle", content:"Tags Populares", fill:"#1a1a2e", fontFamily:"Inter", fontSize:14, fontWeight:"700"})
I("popularTagsWidget", {type:"frame", name:"tagsGrid", gap:8, flexWrap:"wrap"})
// Tags populares
I("tagsGrid", {type:"frame", name:"tag1", alignItems:"center", cornerRadius:999, fill:"#f5f5f5", padding:[6,12], stroke:{align:"inside", fill:"#e0e0e0", thickness:1}})
I("tag1", {type:"text", name:"tag1Lbl", content:"mercados", fill:"#666666", fontFamily:"Inter", fontSize:12})
I("tagsGrid", {type:"frame", name:"tag2", alignItems:"center", cornerRadius:999, fill:"#f5f5f5", padding:[6,12], stroke:{align:"inside", fill:"#e0e0e0", thickness:1}})
I("tag2", {type:"text", name:"tag2Lbl", content:"reserva federal", fill:"#666666", fontFamily:"Inter", fontSize:12})
I("tagsGrid", {type:"frame", name:"tag3", alignItems:"center", cornerRadius:999, fill:"#f5f5f5", padding:[6,12], stroke:{align:"inside", fill:"#e0e0e0", thickness:1}})
I("tag3", {type:"text", name:"tag3Lbl", content:"bitcoin", fill:"#666666", fontFamily:"Inter", fontSize:12})
I("tagsGrid", {type:"frame", name:"tag4", alignItems:"center", cornerRadius:999, fill:"#f5f5f5", padding:[6,12], stroke:{align:"inside", fill:"#e0e0e0", thickness:1}})
I("tag4", {type:"text", name:"tag4Lbl", content:"inflación", fill:"#666666", fontFamily:"Inter", fontSize:12})
```

---

## Batch 5 — Paginación + Footer (≈12 ops)

```js
// Paginación
I("catPage", {type:"frame", name:"pagination", width:"fill_container", height:80, alignItems:"center", justifyContent:"center", fill:"#f5f5f5", gap:24})
I("pagination", {type:"text", name:"paginationInfo", content:"Mostrando 1-12 de 245 artículos", fill:"#666666", fontFamily:"Inter", fontSize:13})
I("pagination", {type:"frame", name:"loadMoreBtn", alignItems:"center", justifyContent:"center", cornerRadius:6, fill:"#00d4aa", padding:[12,24], height:44})
I("loadMoreBtn", {type:"text", name:"loadMoreBtnLbl", content:"Cargar más artículos", fill:"#ffffff", fontFamily:"Inter", fontSize:14, fontWeight:"600"})

// Footer
I("catPage", {type:"frame", name:"footer", width:"fill_container", layout:"vertical", fill:"#1a1a2e"})
I("footer", {type:"frame", name:"footerMain", width:"fill_container", padding:[40,80,32,80]})
I("footerMain", {type:"frame", name:"footerBrand", width:260, layout:"vertical", gap:12})
I("footerBrand", {type:"text", name:"footerLogo", content:"NexoPress", fill:"#00d4aa", fontFamily:"Playfair Display", fontSize:22, fontWeight:"700"})
I("footerBrand", {type:"text", name:"footerTagline", content:"El portal de noticias económicas de confianza", fill:"#666666", fontFamily:"Inter", fontSize:13})
I("footer", {type:"frame", name:"footerLegal", width:"fill_container", alignItems:"center", justifyContent:"center", padding:[16,80], stroke:{align:"inside", fill:"#333333", thickness:{top:1}}})
I("footerLegal", {type:"text", name:"footerCopy", content:"© 2026 NexoPress. Todos los derechos reservados.", fill:"#666666", fontFamily:"Inter", fontSize:12})
```

---

## Imágenes AI (después de crear todos los frames)

Usar `G()` o actualizar los frames de imagen una vez que estén creados.
Los IDs de los frames de imagen serán asignados en tiempo de ejecución.
Consultar los IDs con `get_editor_state()` después del Batch 4 y aplicar:

```
featuredImg  → AI: "Economic trading floor with professionals analyzing market data"
card1Img     → AI: "Growth charts and financial symbols representing emerging markets"
card2Img     → AI: "Bitcoin cryptocurrency digital coins with upward trend"
card3Img     → AI: "IMF world bank meeting with economists and flags"
card4Img     → AI: "Currency exchange dollar bill and coins global finance"
card5Img     → AI: "Oil barrels and petroleum industry with market indicators"
card6Img     → AI: "Buenos Aires financial district buildings and stock market"
card7Img     → AI: "European central bank building classic architecture"
card8Img     → AI: "China financial district Shanghai skyline economic growth"
card9Img     → AI: "Mexico city business district foreign investment concept"
```

---

## Verificación final

```js
// 1. Verificar estado del editor
get_editor_state()

// 2. Screenshot del Category Hero
get_screenshot(filePath, nodeId_catHero)

// 3. Screenshot del grid de artículos
get_screenshot(filePath, nodeId_mainArea)

// 4. Screenshot completo
get_screenshot(filePath, nodeId_root)
```

---

## Contexto importante para el agente

1. **Pencil no permite referencias entre archivos .pen** — todos los componentes son inline
2. **Los IDs son generados automáticamente** — los que aparecen en este plan son de referencia para las operaciones de inserción jerárquica. Usar `get_editor_state()` para obtener IDs reales después de cada batch
3. **La operación `G()` para imágenes AI** tuvo problemas en sesión anterior — intentar con los IDs reales después de crear los frames
4. **El nombre correcto del frame raíz** en los otros archivos es el primer argumento de `I()`. Para este archivo sería el ID del documento (obtener con `get_editor_state()`)
5. **Fuente Inter** (no Source Sans Pro — no disponible en Pencil)
6. **Demostrar categoría "Economía"** — el color #00d4aa es el teal. Las otras categorías siguen el mismo patrón cambiando el color

---

## Archivos relacionados

- `designs/news-templates/DESIGN_TOKENS.md` — diccionario de tokens
- `designs/news-templates/TODO.md` — estado del proyecto
- `designs/news-templates/TRANSCRIPCION_COMPONENTES.md` — arquitectura original
- `designs/news-templates/news-homepage.pen` — referencia de estructura header/footer
- `designs/news-templates/news-article.pen` — referencia de breadcrumb y sidebar
