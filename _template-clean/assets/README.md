# Assets auxiliares

Esta carpeta es para assets de referencia que **no se incluyen en el template**
pero pueden ser útiles al generar un sitio nuevo.

- `logo-ejemplo-header.png` — placeholder de logo ticker (agregar después).
- `logo-ejemplo.png` — placeholder de logo general.
- `favicon-ejemplo.png` — placeholder de favicon.

> **Importante**: estos NO se copian al sitio generado. Cada sitio nuevo debe
> traer sus propios assets.

## Tamaños recomendados

| Asset | Tamaño | Formato | Notas |
|---|---|---|---|
| `logo-header.png` | 240×80 px | PNG transparente | Fondo claro. Versión ticker. |
| `logo.png` | 480×160 px | PNG transparente | Master. |
| `logo-footer.png` | 240×80 px | PNG transparente | Si es versión distinta al header. |
| `favicon.png` | 192×192 px | PNG | El browser escala. |

## Convenciones de nombrado

Una vez que el sitio está generado, los archivos deben llamarse **exactamente**:

```
logo-header.png
logo.png
logo-footer.png
favicon.png
```

`components.js` y `index.html` referencian `./logo-header.png` y
`./logo-header.png` (fallback para imágenes rotas). Cualquier otro nombre
rompe la referencia.
