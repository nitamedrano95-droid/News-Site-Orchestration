# TODO - Corrección de sitios de noticias (8 sitios)

## Fase 1: Auditoría y lectura
- [x] Revisar estructura de `elanalisismexicano`
- [x] Revisar `_shared/sw.js`
- [x] Revisar `index.html`, `components.js`, `script.js`, `articulo/index.html`, `categoria/index.html`, `sw.js` de `elanalisismexicano`
- [x] Revisar `index.html`, `components.js`, `articulo/index.html` de `elprofetamexicano`
- [x] Revisar archivos equivalentes de:
  - [x] `enfoquemexicano`
  - [ ] `expresomexicano`
  - [ ] `financemarketsmx`
  - [ ] `mexicannewsoftheworld`
  - [ ] `mexicoandtheworld`
  - [ ] `mexicodaily`

## Fase 2: Corrección segura base (artículo)
- [ ] Corregir 8x `articulo/index.html`:
  - [ ] errores de sintaxis JS
  - [ ] evitar `innerHTML` inseguro con CMS
  - [ ] validar URL de imagen + fallback correcto
  - [ ] asegurar enlaces internos correctos
  - [ ] mantener header/footer/ticker funcionales

## Fase 3: Home y componentes
- [ ] Corregir 8x `index.html`:
  - [ ] rutas consistentes
  - [ ] service worker dentro de documento con carga correcta
  - [ ] carga de artículos robusta
- [ ] Corregir 8x `components.js`:
  - [ ] ticker con ventana/overflow correcto
  - [ ] evitar múltiples intervalos sin control
  - [ ] inserción DOM consistente (header/footer/ticker)

## Fase 4: Validación y entrega
- [ ] Verificación de checklist por sitio (home, ticker, fallback imágenes, enlaces, SW/PWA, móvil/escritorio)
- [ ] Resumen por sitio (problemas + archivos corregidos + justificación)
- [ ] Recomendaciones de prevención de regresiones
