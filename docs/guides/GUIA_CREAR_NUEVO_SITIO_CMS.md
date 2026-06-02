# Guía: Crear un Nuevo Sitio CMS

Esta guía documenta el proceso completo para crear un nuevo sitio dentro del ecosistema de Cloudflare News Project. Cada sitio incluye:
- Worker de Cloudflare para lógica backend
- Base de datos D1 para persistencia
- Sitio estático HTML para frontend
- Sistema de ingesta RSS configurado

---

## 1. Estructura General

```
cloudflare-news-project/
├── cms-originaux/          # Ejemplo: primer CMS (10 sitios)
│   ├── migrations/         # SQL migrations para D1
│   ├── src/
│   │   ├── config.js       # Configuración global
│   │   ├── index.js        # Handler principal del worker
│   │   ├── cron/           # Scripts de cron
│   │   │   ├── rss-ingest.js
│   │   │   ├── facebook-publish.js
│   │   │   └── ticker-update.js
│   │   └── utils/
│   ├── sites/              # Sitios estáticos HTML
│   │   ├── sitio1/
│   │   ├── sitio2/
│   │   └── ...
│   └── wrangler.toml       # Config de Cloudflare
├── cms-nuevos/             # Ejemplo: segundo CMS (17 sitios)
├── cms-nuevos2/            # Ejemplo: tercer CMS (8 sitios)
└── GUIA_CREAR_NUEVO_SITIO_CMS.md
```

---

## 2. Paso 1: Crear el Proyecto Worker

### 2.1 Clonar estructura base
```bash
cd cloudflare-news-project
cp -r cms-originaux cms-tusite  # Reemplazar "tusite" con nombre real
cd cms-tusite
```

### 2.2 Actualizar `wrangler.toml`
```toml
name = "cms-tusite"                    # Nombre único del worker
type = "service"
main = "src/index.js"
compatibility_date = "2025-01-01"

# Bindings D1
[[d1_databases]]
binding = "DB"
database_name = "news_db_cms_tusite"
database_id = "UNIQUE_ID_AQUI"         # Obtener de Cloudflare Dashboard

# Bindings KV
[[kv_namespaces]]
binding = "ARTICLES_KV"
id = "UNIQUE_KV_ID"

# Bindings R2
[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "cms-news"

# Scheduled triggers para cron
[triggers]
crons = ["*/30 * * * *"]               # Ejecutar cada 30 minutos

# Environment variables
[env.production]
vars = { ENVIRONMENT = "production" }
```

### 2.3 Crear la base de datos D1
```bash
# En Cloudflare Dashboard:
# 1. Ir a: D1 → Crear base de datos
# 2. Nombre: news_db_cms_tusite
# 3. Copiar el database_id al wrangler.toml
# 4. Copiar el binding y actualizar wrangler.toml
```

---

## 3. Paso 2: Configurar el Worker

### 3.1 Actualizar `src/config.js`

Listar los sitios estáticos que forman parte de este CMS:

```javascript
// SITIOS_LIST — Array de slugs de sitios en este CMS
export const SITIOS_LIST = [
  'misite1',
  'misite2',
  'misite3',
  // ... agregar todos los sitios
];

// SITE_DOMAIN_MAP — Mapear slug a dominio real
export const SITE_DOMAIN_MAP = {
  misite1: 'https://misite1.com',
  misite2: 'https://misite2.com',
  misite3: 'https://misite3.com',
};

// ALLOWED_ORIGINS — Para CORS
export const ALLOWED_ORIGINS = [
  'https://misite1.com',
  'https://misite2.com',
  'https://misite3.com',
];
```

### 3.2 Copiar handlers en `src/index.js`

El archivo debe exportar los handlers para:
- `fetch`: API REST (artículos, búsqueda, categorías)
- `scheduled`: Cron jobs (ingesta, Facebook, ticker)

Estructura mínima:
```javascript
import { runRSSIngest } from './cron/rss-ingest.js';
import { publishToFacebook } from './cron/facebook-publish.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Rutas principales
    if (url.pathname === '/api/articles') {
      return handleArticlesList(request, env);
    }
    if (url.pathname.match(/^\/api\/articles\/[^/]+$/)) {
      return handleArticleDetail(request, env);
    }
    // ... más rutas
    
    return new Response('Not Found', { status: 404 });
  },
  
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCronTasks(env));
  }
};

async function runCronTasks(env) {
  const results = {};
  try {
    results.ingest = await runRSSIngest(env);
  } catch (e) {
    console.error('[CRON] Ingest error:', e);
  }
  // ... más tareas
  return results;
}
```

---

## 4. Paso 3: Crear Migraciones SQL

### 4.1 Crear `migrations/000_init_tables.sql`

Define todas las tablas necesarias para este CMS. Incluir:

```sql
-- ARTICULOS_PARAFRASEADOS — Repositorio central
CREATE TABLE IF NOT EXISTS ARTICULOS_PARAFRASEADOS (
  ID TEXT PRIMARY KEY,
  TITULO_PARAFRASEADO TEXT NOT NULL,
  SLUG TEXT UNIQUE NOT NULL,
  CONTENIDO TEXT NOT NULL,
  DESCRIPCION_PARAFRASEADA TEXT,
  CATEGORIA TEXT DEFAULT 'NACIONAL',
  AUTOR TEXT DEFAULT 'NewsBot',
  FECHA_PUBLICACION TEXT DEFAULT CURRENT_TIMESTAMP,
  URL_IMAGEN TEXT,
  SOURCE_URL TEXT,
  ESTADO TEXT DEFAULT 'PUBLICADO',
  SITIO_DESTINO TEXT,
  CRIADO_EN TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_articulos_slug ON ARTICULOS_PARAFRASEADOS(SLUG);
CREATE INDEX idx_articulos_fecha ON ARTICULOS_PARAFRASEADOS(FECHA_PUBLICACION);
CREATE INDEX idx_articulos_categoria ON ARTICULOS_PARAFRASEADOS(CATEGORIA);

-- Tabla de configuración de sitios
CREATE TABLE IF NOT EXISTS SITIOS (
  SLUG TEXT PRIMARY KEY,
  NOMBRE TEXT NOT NULL,
  DOMINIO TEXT,
  FACEBOOK_ACTIVO INTEGER DEFAULT 1,
  FACEBOOK_PAGE_ID TEXT,
  FACEBOOK_TOKEN_SECRET TEXT
);

-- Tablas por sitio (ARTICULOS_SITIO_NOMSITIO)
-- Repetir para cada sitio en SITIOS_LIST
CREATE TABLE IF NOT EXISTS ARTICULOS_SITIO_MISITE1 (
  ID TEXT PRIMARY KEY,
  ID_PARAFRASEADO TEXT NOT NULL,
  FECHA_ASIGNACION TEXT DEFAULT CURRENT_TIMESTAMP,
  FB_PUBLICADO INTEGER DEFAULT 0,
  FB_FECHA TEXT,
  FB_POST_ID TEXT,
  FOREIGN KEY (ID_PARAFRASEADO) REFERENCES ARTICULOS_PARAFRASEADOS(ID)
);

-- Timers para Facebook publishing
CREATE TABLE IF NOT EXISTS FB_TIMERS (
  SITE_SLUG TEXT PRIMARY KEY,
  LAST_POST_MS INTEGER DEFAULT 0,
  UPDATED_AT TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Importante**: Crear una tabla `ARTICULOS_SITIO_{SITIO_SLUG}` para cada sitio en mayúsculas.

### 4.2 Crear `migrations/001_create_fuentes_table.sql`

```sql
CREATE TABLE IF NOT EXISTS FUENTES (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  SITIO_SLUG TEXT NOT NULL,
  NOMBRE TEXT NOT NULL,
  URL TEXT NOT NULL,
  TIPO TEXT NOT NULL DEFAULT 'RSS',  -- 'RSS' o 'SCRAPING'
  SELECTORES_LINKS TEXT,
  CATEGORIA TEXT,
  ACTIVA INTEGER DEFAULT 1,
  CREATED_AT TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fuentes_sitio ON FUENTES(SITIO_SLUG, ACTIVA);
CREATE INDEX idx_fuentes_tipo ON FUENTES(TIPO, ACTIVA);
```

### 4.3 Crear `migrations/seed_fuentes_cms_tusite.sql`

Asignar feeds RSS a cada sitio. Formato:

```sql
-- misite1 (5-6 feeds RSS)
INSERT INTO FUENTES (SITIO_SLUG, NOMBRE, URL, TIPO, CATEGORIA) VALUES
('misite1', 'La Jornada / Edición Completa', 'https://www.jornada.com.mx/rss/edicion.xml', 'RSS', 'nacional'),
('misite1', 'Expansión / RSS', 'https://expansion.mx/rss', 'RSS', 'economia'),
('misite1', 'Reforma / Portada', 'https://www.reforma.com/rss/portada.xml', 'RSS', 'nacional'),
('misite1', 'Proceso / RSS', 'https://www.proceso.com.mx/rss/feed.html', 'RSS', 'politica'),
('misite1', 'Infobae / México', 'https://www.infobae.com/arc/outboundfeeds/rss/?outputType=xml&section=mexico', 'RSS', 'nacional');

-- misite2 (5-6 feeds RSS)
INSERT INTO FUENTES (SITIO_SLUG, NOMBRE, URL, TIPO, CATEGORIA) VALUES
('misite2', 'La Jornada / Edición Completa', 'https://www.jornada.com.mx/rss/edicion.xml', 'RSS', 'nacional'),
-- ...
```

**Recomendación**: Usar feeds RSS públicos y reconocidos (La Jornada, Expansión, Reforma, Proceso, Infobae).

---

## 5. Paso 4: Aplicar Migraciones

```bash
# Crear tablas de base
npx wrangler d1 execute news_db_cms_tusite \
  --remote \
  --file=migrations/000_init_tables.sql \
  --config=wrangler.toml

# Crear tabla de fuentes
npx wrangler d1 execute news_db_cms_tusite \
  --remote \
  --file=migrations/001_create_fuentes_table.sql \
  --config=wrangler.toml

# Cargar seeds de fuentes RSS
npx wrangler d1 execute news_db_cms_tusite \
  --remote \
  --file=migrations/seed_fuentes_cms_tusite.sql \
  --config=wrangler.toml

# Verificar
npx wrangler d1 execute news_db_cms_tusite \
  --remote \
  --command="SELECT SITIO_SLUG, COUNT(*) as n FROM FUENTES GROUP BY SITIO_SLUG" \
  --config=wrangler.toml
```

---

## 6. Paso 5: Crear Sitios Estáticos HTML

### 6.1 Estructura de directorio por sitio
```
sites/misite1/
├── index.html              # Página principal
├── articulo/
│   └── index.html          # Página de artículo (dinámico)
├── categoria/
│   ├── index.html          # Listado de categorías
│   ├── nacional.html
│   ├── economia.html
│   └── ...
├── acerca-de.html
├── contacto.html
├── style.css               # Estilos principales
├── article.css             # Estilos de artículos
├── style-custom.css        # Estilos personalizados
├── script.js               # JavaScript principal
├── script.js.backup        # Backup
├── components.js           # Componentes reutilizables
├── functions/              # Funciones utils
├── assets/                 # Imágenes, fonts
├── _redirects              # Cloudflare Pages redirects
├── _routes.json            # Cloudflare Pages routing
├── favicon.ico
└── wrangler.toml           # Config para Cloudflare Pages
```

### 6.2 Template mínimo para `articulo/index.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title id="page-title">Cargando...</title>
    <meta name="description" id="page-desc" content="">
    <!-- OG Tags para redes sociales -->
    <meta property="og:title" id="og-title" content="">
    <meta property="og:description" id="og-desc" content="">
    <meta property="og:image" id="og-image" content="">
    <meta property="og:type" content="article">
    <meta property="og:url" id="og-url" content="">
    <!-- Estilos -->
    <link rel="stylesheet" href="../style.css">
    <link rel="stylesheet" href="../article.css">
    <link rel="stylesheet" href="../style-custom.css">
</head>
<body>
    <div id="site-header"></div>
    <main class="main-content article-page">
        <div class="container">
            <div id="article-loading" style="text-align:center;padding:60px 20px;">
                <p>Cargando artículo...</p>
            </div>
            <div id="article-error" style="display:none;text-align:center;padding:60px 20px;">
                <h2>Artículo no encontrado</h2>
                <a href="../index.html">← Volver al inicio</a>
            </div>
            <article id="article-content" class="article-full" style="display:none;">
                <div class="article-header">
                    <span id="art-category-badge" class="article-category-badge"></span>
                    <h1 id="art-title" class="article-title"></h1>
                    <div class="article-meta">
                        <span class="author">Por <span id="art-author"></span></span>
                        <span class="separator">•</span>
                        <span class="date"><span id="art-date"></span></span>
                    </div>
                </div>
                <div class="article-image-wrapper" id="art-image-wrapper">
                    <img id="art-image" class="article-image" src="" alt="" loading="lazy">
                </div>
                <div id="art-body" class="article-content"></div>
                <div class="article-footer">
                    <a href="../index.html">← Volver al inicio</a>
                </div>
            </article>
        </div>
    </main>
    <div id="site-footer"></div>

    <script src="../script.js"></script>
    <script>
    (async function() {
        const params = new URLSearchParams(location.search);
        const slug = params.get('slug');
        if (!slug) { showError(); return; }
        
        try {
            // ⚠️ Reemplazar con la URL real del worker
            const res = await fetch('https://cms-tusite.sebastianvernis.workers.dev/api/articles/' + encodeURIComponent(slug));
            if (!res.ok) throw new Error('not found');
            const data = await res.json();
            const a = data.article;
            if (!a) throw new Error('empty');
            renderArticle(a);
        } catch(e) { 
            console.error('Error:', e);
            showError(); 
        }

        function renderArticle(a) {
            document.title = (a.title || 'Artículo') + ' - Mi Sitio';
            document.getElementById('art-title').textContent = a.title || '';
            document.getElementById('art-author').textContent = a.author || 'Redacción';
            document.getElementById('art-date').textContent = 
                a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('es-MX') : '';
            
            const badge = document.getElementById('art-category-badge');
            if (badge) { 
                badge.textContent = a.category || '';
                badge.className = 'article-category-badge cat-' + (a.category || '').toLowerCase();
            }
            
            const img = document.getElementById('art-image');
            if (a.imageUrl && img) {
                img.src = a.imageUrl;
                img.alt = a.title || '';
                img.onerror = function() { this.src = '../logo.png'; };
            }
            
            const body = document.getElementById('art-body');
            if (body) {
                let content = a.content || '';
                if (!content) {
                    content = '<p>' + (a.excerpt || '') + '</p>';
                } else if (!content.includes('<p>') && !content.includes('<div>')) {
                    content = content.split(/\n\n+/).map(p => '<p>' + p.trim() + '</p>').join('');
                }
                body.innerHTML = content;
            }
            
            document.getElementById('article-loading').style.display = 'none';
            document.getElementById('article-content').style.display = 'block';
        }
        
        function showError() {
            document.getElementById('article-loading').style.display = 'none';
            document.getElementById('article-error').style.display = 'block';
        }
    })();
    </script>
</body>
</html>
```

### 6.3 Template mínimo para `index.html` (Página principal)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Sitio - Noticias</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="style-custom.css">
</head>
<body>
    <div id="site-header"></div>
    <main class="main-content">
        <div class="container">
            <h1>Últimas Noticias</h1>
            <div id="articles-list" class="articles-grid">
                <!-- Artículos cargados dinámicamente -->
            </div>
        </div>
    </main>
    <div id="site-footer"></div>

    <script src="script.js"></script>
    <script>
    (async function() {
        try {
            // ⚠️ Reemplazar con URL real del worker
            const res = await fetch('https://cms-tusite.sebastianvernis.workers.dev/api/articles?limit=12');
            const data = await res.json();
            const container = document.getElementById('articles-list');
            
            for (const article of data.articles) {
                const card = document.createElement('div');
                card.className = 'article-card';
                card.innerHTML = `
                    <img src="${article.imageUrl}" alt="${article.title}" loading="lazy">
                    <div class="card-content">
                        <span class="badge">${article.category}</span>
                        <h3><a href="articulo/?slug=${encodeURIComponent(article.slug)}">${article.title}</a></h3>
                        <p>${article.excerpt || ''}</p>
                        <small>${new Date(article.publishedAt).toLocaleDateString('es-MX')}</small>
                    </div>
                `;
                container.appendChild(card);
            }
        } catch(e) {
            console.error('Error cargando artículos:', e);
        }
    })();
    </script>
</body>
</html>
```

---

## 7. Paso 6: Implementar Handlers en el Worker

### 7.1 Handler de lista de artículos

```javascript
async function handleArticlesList(request, env) {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '12');
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');
  const page = parseInt(url.searchParams.get('page') || '0');
  const offset = page * limit;

  let query = 'SELECT * FROM ARTICULOS_PARAFRASEADOS WHERE ESTADO = "PUBLICADO"';
  const params = [];

  if (category) {
    query += ' AND CATEGORIA = ?';
    params.push(category.toUpperCase());
  }
  
  if (search) {
    query += ' AND (TITULO_PARAFRASEADO LIKE ? OR CONTENIDO LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY FECHA_PUBLICACION DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  try {
    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...params).all();
    
    return new Response(JSON.stringify({
      articles: result.results || [],
      total: result.results?.length || 0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
```

### 7.2 Handler de detalle de artículo

```javascript
async function handleArticleDetail(request, env) {
  const slug = request.url.split('/').pop();

  try {
    const article = await env.DB.prepare(
      'SELECT * FROM ARTICULOS_PARAFRASEADOS WHERE SLUG = ? AND ESTADO = "PUBLICADO"'
    ).bind(slug).first();

    if (!article) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ article }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
```

---

## 8. Paso 7: Deploying

### 8.1 Deploy del worker
```bash
cd cms-tusite
npm install
wrangler deploy --config wrangler.toml
```

Verificar que el worker esté activo en:
```
https://cms-tusite.sebastianvernis.workers.dev/api/articles
```

### 8.2 Deploy de sitios estáticos
```bash
# Cada sitio tiene su propio wrangler.toml
cd sites/misite1
wrangler deploy --config wrangler.toml
```

O usar Cloudflare Pages:
```bash
# Conectar repositorio a Pages
# Configurar build command: (ninguno para sitios estáticos)
# Configurar output directory: sites/misite1/
```

---

## 9. Verificación Post-Deploy

```bash
# 1. Verificar tablas de D1
npx wrangler d1 execute news_db_cms_tusite --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name" \
  --config=wrangler.toml

# 2. Verificar fuentes
npx wrangler d1 execute news_db_cms_tusite --remote \
  --command="SELECT SITIO_SLUG, COUNT(*) as n FROM FUENTES GROUP BY SITIO_SLUG" \
  --config=wrangler.toml

# 3. Ejecutar cron manual
curl -s https://cms-tusite.sebastianvernis.workers.dev/api/cron/manual

# 4. Verificar artículos
curl -s https://cms-tusite.sebastianvernis.workers.dev/api/articles?limit=5 | jq '.articles | .[0]'

# 5. Verificar sitio estático
curl -s https://misite1.com/ | grep -o '<title>.*</title>'
```

---

## 10. Checklist Final

- [ ] Proyecto clonado de cms-originaux
- [ ] wrangler.toml actualizado con nombres únicos
- [ ] D1 database creada y vinculada
- [ ] KV namespace creado y vinculado
- [ ] R2 bucket configurado
- [ ] src/config.js actualizado con SITIOS_LIST
- [ ] Migraciones SQL creadas (000, 001, seed)
- [ ] Migraciones aplicadas a D1 remota
- [ ] Sitios HTML creados con estructura correcta
- [ ] Workers deployed
- [ ] Sitios estáticos deployed
- [ ] Cron manual ejecutado exitosamente
- [ ] Artículos visibles en API
- [ ] Artículos visibles en sitios estáticos
- [ ] Imágenes cargadas a R2

---

## 11. Solución de Problemas

| Problema | Causa | Solución |
|----------|-------|----------|
| `Table not found` | Migraciones no aplicadas | Ejecutar migrations con `--remote` |
| No articles ingested | FUENTES tabla vacía | Ejecutar seed_fuentes_cms_tusite.sql |
| API returns 500 | Error en handler | Revisar logs: `wrangler tail` |
| Imágenes no cargan | R2 bucket no configurado | Verificar binding en wrangler.toml |
| CORS errors | ALLOWED_ORIGINS incompleto | Agregar dominio del sitio a config.js |
| Artículos mal asignados | SITIO_SLUG errado | Verificar que SITIOS_LIST coincide con FUENTES |

---

## 12. Convenciones de Naming

```
Worker:          cms-{nombrebreve}
Database:        news_db_cms_{nombrebreve}
KV Namespace:    articles-{nombrebreve}
Sitios:          {slug1}, {slug2}, ...  (minúsculas, sin espacios)
Tablas sitios:   ARTICULOS_SITIO_{SLUG_EN_MAYUSCULAS}
Domain:          https://{slug}.{domain}
```

---

## 13. Variables de Entorno Recomendadas

En `wrangler.toml`:
```toml
[env.production]
vars = {
  ENVIRONMENT = "production",
  MAX_ARTICLES_PER_RUN = "4",
  MAX_ARTICLES_FIRST_RUN = "15",
  RSS_FETCH_TIMEOUT = "10000"
}
```

---

**Última actualización**: 2026-04-20  
**Version**: 1.0  
**Autor**: Sebastian Vernis
