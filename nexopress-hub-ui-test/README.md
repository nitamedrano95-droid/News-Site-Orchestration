# NexoPress Hub UI

Frontend React del Panel Editorial Unificado para los 5 CMS de Cloudflare Workers.

## Stack

- **React 18** con Vite
- **React Router** para navegación
- **TipTap** (ProseMirror) para el editor de bloques
- **CSS nativo** (sin frameworks) con tema dark

## Desarrollo local

```bash
cd nexopress-hub-ui
npm install
npm run dev
```

El dev server corre en `http://localhost:3000` y hace proxy de `/api` al Worker del Hub en `localhost:8787`.

## Build para producción

```bash
npm run build
```

El output va a `dist/`. Deployar a Cloudflare Pages:

```bash
wrangler pages deploy dist --project-name=nexopress-hub-ui
```

## Variables de entorno

Crear `.env` (opcional, para desarrollo):

```
VITE_API_BASE=/api
```

En producción, el proxy de Vite no aplica — las peticiones van directo al Worker del Hub.

## Estructura

```
src/
  main.jsx           # Entry point + routing
  index.css          # Estilos globales + tema dark
  pages/
    Login.jsx        # Página de login
    Dashboard.jsx    # Dashboard cross-CMS
    Editor.jsx       # Editor TipTap + sidebar SEO
  components/
    SeoPanel.jsx     # Panel SEO tipo Yoast (readability + focus keyword + SERP preview)
```

## Rutas

- `/login` — Login (email + password)
- `/` — Dashboard con estadísticas de los 5 CMS
- `/editor/:cms/:articleId` — Editor (articleId = `new` para artículo nuevo)

## Autenticación

El token se guarda en `localStorage` como `hub_token`. Las peticiones incluyen:

```
Authorization: Bearer <hub_token>
```

## SEO Panel

El panel implementa:

1. **Legibilidad Fernandez-Huerta** (adaptado para español)
   - Score 0-100
   - Detección de oraciones/párrafos largos
   - Detección de falta de subtítulos (H2)

2. **Análisis de focus keyword**
   - Presencia en título, slug, meta description, primer párrafo
   - Densidad de keyword (0.5%-2.5% óptimo)
   - Longitud de título (40-60 chars) y meta description (120-156 chars)

3. **SERP Preview** — vista previa de cómo se vería en Google

4. **Recomendaciones en tiempo real** — el score se recalcula mientras escribís
