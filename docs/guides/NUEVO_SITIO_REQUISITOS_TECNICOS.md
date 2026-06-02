# Requisitos Técnicos para Nuevos Sitios - Compatibilidad CMS

## Overview

Este documento establece los requisitos técnicos para crear nuevos sitios de noticias que sean compatibles con cualquiera de los 3 sistemas CMS del proyecto:

- **cms-originaux**: 10 sitios (ej: radiocinconoticias)
- **cms-nuevos**: 17 sitios
- **cms-nuevos2**: 8 sitios

Todos los CMS comparten arquitectura Cloudflare y esquema de base de datos idéntico.

---

## 1. Arquitectura Cloudflare

### Stack Tecnológico

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| Workers | Cloudflare Workers (Hono) | API y rendering |
| Database | D1 (SQLite) | Almacenamiento de artículos |
| Cache | KV Namespace | Cache por sitio |
| Storage | R2 Bucket | Imágenes compartidas |
| Cron | Workers Cron | Actualización cada 30 min |

### wrangler.toml Requerido

```toml
name = "nuevo-sitio"
main = "src/index.js"
compatibility_date = "2024-01-01"

[site]
bucket = "./sites/nuevo-sitio"

[[d1_databases]]
binding = "DB"
database_name = "nuevo-sitio-db"
database_id = "REEMPLAZAR_CON_DATABASE_ID"

[[kv_namespaces]]
binding = "CACHE"
id = "REEMPLAZAR_CON_KV_ID"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "news-images"
```

---

## 2. Estructura de Archivos del Sitio

```
sites/nuevo-sitio/
├── index.html              # Portada principal
├── estilos/
│   ├── main.css           # Estilos principales
│   ├── header.css         # Estilos header
│   ├── footer.css         # Estilos footer
│   ├── article.css        # Estilos artículo
│   └── widgets.css        # Estilos widgets (ticker, weather)
├── js/
│   ├── main.js            # Lógica principal
│   ├── api.js             # Cliente API
│   ├── components/
│   │   ├── Header.js      # Componente header
│   │   ├── Footer.js      # Componente footer
│   │   ├── Ticker.js      # Componente ticker financiero
│   │   └── Weather.js     # Widget de clima
│   └── utils/
│       └── helpers.js     # Utilidades generales
├── article/
│   └── [slug].html        # Template de artículo individual
├── category/
│   └── [category].html     # Template de categoría
├── search/
│   └── index.html         # Página de búsqueda
└── 404.html               # Página de error 404
```

---

## 3. Esquema de Base de Datos (D1)

### Tablas Obligatorias por Sitio

```sql
-- Tabla principal de artículos del sitio
CREATE TABLE ARTICULOS_SITIO_NUEVOSITIO (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_artículo_original INTEGER,
    id_artículo_paráfraseado INTEGER,
    slug TEXT UNIQUE NOT NULL,
    título TEXT NOT NULL,
    contenido TEXT,
    resumen TEXT,
    imagen_principal TEXT,
    fecha_publicación INTEGER,
    fecha_actualización INTEGER,
    autor TEXT,
    categoría TEXT,
    etiquetas TEXT,
    publicado INTEGER DEFAULT 0,
    FOREIGN KEY (id_artículo_original) REFERENCES ARTICULOS_ORIGINALES(id),
    FOREIGN KEY (id_artículo_paráfraseado) REFERENCES ARTICULOS_PARAFRASEADOS(id)
);

-- Índices obligatorios
CREATE INDEX idx_slug ON ARTICULOS_SITIO_NUEVOSITIO(slug);
CREATE INDEX idx_fecha ON ARTICULOS_SITIO_NUEVOSITIO(fecha_publicación DESC);
CREATE INDEX idx_categoría ON ARTICULOS_SITIO_NUEVOSITIO(categoría);
CREATE INDEX idx_publicado ON ARTICULOS_SITIO_NUEVOSITIO(publicado);
```

### Tablas Compartidas (ya existen en todos los CMS)

```sql
-- Tabla de sitios
CREATE TABLE SITIOS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    dominio TEXT,
    descripción TEXT,
    logo TEXT,
    configuración TEXT,
    activo INTEGER DEFAULT 1,
    fecha_creación INTEGER
);

-- Tabla de categorías
CREATE TABLE CATEGORIAS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sitio_slug TEXT NOT NULL,
    nombre TEXT NOT NULL,
    slug TEXT NOT NULL,
    descripción TEXT,
    FOREIGN KEY (sitio_slug) REFERENCES SITIOS(slug)
);

-- Tabla de usuarios
CREATE TABLE USUARIOS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sitio_slug TEXT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol TEXT DEFAULT 'editor',
    FOREIGN KEY (sitio_slug) REFERENCES SITIOS(slug)
);
```

---

## 4. API Routes Disponibles

### Endpoints por CMS

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/articles` | Listar artículos |
| GET | `/api/articles/:slug` | Obtener artículo por slug |
| GET | `/api/categories` | Listar categorías |
| GET | `/api/sites` | Listar sitios |
| GET | `/api/facebook/status` | Estado de Facebook |
| POST | `/api/facebook/publish` | Publicar en Facebook |
| GET | `/api/ticker` | Datos ticker financiero |
| GET | `/api/weather` | Datos del clima |
| GET | `/api/rss/:sitio` | Feed RSS |
| POST | `/api/cron/update` | Forzar actualización |
| GET | `/api/stats/:sitio` | Estadísticas |

### Ejemplo de Uso JavaScript

```javascript
// Cliente API base
const API_BASE = '/api';

// Obtener artículos
async function getArticles(siteSlug, limit = 20) {
    const response = await fetch(`${API_BASE}/articles?site=${siteSlug}&limit=${limit}`);
    return response.json();
}

// Obtener artículo individual
async function getArticle(siteSlug, slug) {
    const response = await fetch(`${API_BASE}/articles/${siteSlug}/${slug}`);
    return response.json();
}

// Publicar en Facebook
async function publishToFacebook(siteSlug, articleId) {
    const response = await fetch(`${API_BASE}/facebook/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site: siteSlug, article_id: articleId })
    });
    return response.json();
}
```

---

## 5. Componentes Frontend

### Header Component

```javascript
class Header {
    constructor(container, siteConfig) {
        this.container = container;
        this.siteConfig = siteConfig;
    }

    async render() {
        const categories = await this.fetchCategories();
        this.container.innerHTML = `
            <header class="site-header">
                <div class="logo">
                    <img src="${this.siteConfig.logo}" alt="${this.siteConfig.nombre}">
                </div>
                <nav class="main-nav">
                    ${categories.map(cat => `
                        <a href="/category/${cat.slug}">${cat.nombre}</a>
                    `).join('')}
                </nav>
                <div class="header-ticker">
                    <div id="ticker-container"></div>
                </div>
            </header>
        `;
    }
}
```

### Article Component

```javascript
class ArticleCard {
    static render(article) {
        return `
            <article class="article-card">
                <img src="${article.imagen_principal}" alt="${article.título}" loading="lazy">
                <div class="article-content">
                    <span class="article-category">${article.categoría}</span>
                    <h2><a href="/article/${article.slug}">${article.título}</a></h2>
                    <p class="article-summary">${article.resumen || ''}</p>
                    <div class="article-meta">
                        <span class="article-date">${formatDate(article.fecha_publicación)}</span>
                        <span class="article-author">${article.autor || 'Staff'}</span>
                    </div>
                </div>
            </article>
        `;
    }
}
```

### SEO y Open Graph

```html
<!-- Meta tags dinámicos por artículo -->
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{articulo.título}} | {{sitio.nombre}}</title>
    <meta name="description" content="{{articulo.resumen}}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="{{articulo.título}}">
    <meta property="og:description" content="{{articulo.resumen}}">
    <meta property="og:image" content="{{articulo.imagen_principal}}">
    <meta property="og:url" content="{{sitio.dominio}}/article/{{articulo.slug}}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="{{sitio.nombre}}">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{articulo.título}}">
    <meta name="twitter:description" content="{{articulo.resumen}}">
    <meta name="twitter:image" content="{{articulo.imagen_principal}}">
</head>
```

---

## 6. Proceso de Integración a un CMS

### Paso 1: Crear estructura en el CMS destino

```bash
# Para cms-originaux
cd cms-originaux/sites/
mkdir -p nuevo-sitio/{estilos,js,article,category,search}

# Para cms-nuevos o cms-nuevos2
cd cms-nuevos/sites/
# o
cd cms-nuevos2/sites/
mkdir -p nuevo-sitio/{estilos,js,article,category,search}
```

### Paso 2: Registrar sitio en base de datos

```sql
-- Insertar en tabla SITIOS
INSERT INTO SITIOS (slug, nombre, dominio, descripción, logo, activo, fecha_creación)
VALUES (
    'nuevo-sitio',
    'Nuevo Sitio de Noticias',
    'https://nuevositio.cloudflare.pages.dev',
    'Descripción del nuevo sitio',
    'https://r2.cloudflare.com/news-images/nuevositio/logo.png',
    1,
    CAST(strftime('%s', 'now') AS INTEGER)
);

-- Insertar categorías iniciales
INSERT INTO CATEGORIAS (sitio_slug, nombre, slug, descripción)
VALUES 
    ('nuevo-sitio', 'Nacional', 'nacional', 'Noticias de ámbito nacional'),
    ('nuevo-sitio', 'Internacional', 'internacional', 'Noticias internacionales'),
    ('nuevo-sitio', 'Economía', 'economia', 'Noticias económicas'),
    ('nuevo-sitio', 'Deportes', 'deportes', 'Noticias deportivas');
```

### Paso 3: Crear tabla de artículos del sitio

```sql
CREATE TABLE ARTICULOS_SITIO_NUEVOSITIO (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_artículo_original INTEGER,
    id_artículo_paráfraseado INTEGER,
    slug TEXT UNIQUE NOT NULL,
    título TEXT NOT NULL,
    contenido TEXT,
    resumen TEXT,
    imagen_principal TEXT,
    fecha_publicación INTEGER,
    fecha_actualización INTEGER,
    autor TEXT,
    categoría TEXT,
    etiquetas TEXT,
    publicado INTEGER DEFAULT 0
);
```

### Paso 4: Configurar wrangler.toml del CMS

```toml
# Agregar al wrangler.toml del CMS destino
[[site]]
bucket = "./sites/nuevo-sitio"

# Agregar binding de D1 si es nuevo
# [[d1_databases]] - ya existe la base de datos principal
```

### Paso 5: Reiniciar Worker

```bash
# En el directorio del CMS destino
wrangler deploy
```

---

## 7. Configuración de Facebook Publishing

### Tabla FB_TIMERS

```sql
CREATE TABLE FB_TIMERS (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_slug TEXT NOT NULL,
    article_id INTEGER NOT NULL,
    scheduled_time INTEGER NOT NULL,
    published INTEGER DEFAULT 0,
    facebook_post_id TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    fecha_creación INTEGER,
    FOREIGN KEY (site_slug) REFERENCES SITIOS(slug)
);
```

### Configuración de Token

```javascript
// En config.js del CMS
const FACEBOOK_CONFIG = {
    'nuevo-sitio': {
        pageAccessToken: 'REEMPLAZAR_CON_TOKEN',
        pageId: 'REEMPLAZAR_CON_PAGE_ID'
    }
};
```

---

## 8. Checklist de Implementación

- [ ] Crear estructura de archivos del sitio
- [ ] Implementar templates HTML con SEO
- [ ] Implementar componentes JS (Header, Footer, ArticleCard)
- [ ] Implementar widget de ticker financiero
- [ ] Implementar widget de clima
- [ ] Crear tabla ARTICULOS_SITIO_[SLUG]
- [ ] Registrar sitio en tabla SITIOS
- [ ] Registrar categorías en tabla CATEGORIAS
- [ ] Configurar wrangler.toml
- [ ] Configurar Facebook (token y page ID)
- [ ] Probar endpoints API
- [ ] Verificar RSS feed
- [ ] Deploy y verificación final

---

## 9. Migración Entre CMS

Para migrar un sitio existente a otro CMS:

1. **Exportar datos**: Extraer todos los registros de `ARTICULOS_SITIO_[SLUG]`
2. **Transferir archivos**: Copiar carpeta completa del sitio
3. **Importar datos**: Insertar en la tabla del nuevo CMS
4. **Actualizar bindings**: Modificar wrangler.toml del CMS destino
5. **Redeploy**: Ejecutar `wrangler deploy`

---

## 10. Notas Adicionales

- Todos los CMS usan el mismo esquema D1
- Las imágenes se almacenan en R2 compartido (`news-images`)
- El cron de 30 minutos actualiza contenido automáticamente
- La paráfrasis de artículos usa AI (configurable por sitio)
- Facebook publishing es opcional pero recomendado

---

*Última actualización: Marzo 2026*
*Versión: 1.0*
