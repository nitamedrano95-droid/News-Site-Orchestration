# Guía: Crear Sitios Estáticos HTML

Guía detallada para crear sitios estáticos de noticias usando **Pencil.dev** (diseño) y **Stitch** (código). Todos los sitios comparten estructura y componentes reutilizables.

---

## 1. Estructura General de Directorio

```
sites/misite/
├── index.html                    # Página principal (portada)
├── articulo/
│   └── index.html                # Página de artículo individual
├── categoria/
│   ├── index.html                # Listado de categorías disponibles
│   ├── nacional.html             # Artículos de categoría "nacional"
│   ├── economia.html
│   ├── politica.html
│   ├── cultura.html
│   ├── deportes.html
│   ├── tecnologia.html
│   └── entretenimiento.html
├── acerca-de.html                # Página de información del sitio
├── contacto.html                 # Formulario de contacto
├── privacidad.html               # Política de privacidad
├── terminos.html                 # Términos de servicio
├── legal.css                     # Estilos legales (privacidad/términos)
├── style.css                     # Estilos principales (layout, tipografía)
├── article.css                   # Estilos específicos de artículos
├── style-custom.css              # Estilos personalizados por marca
├── script.js                     # JavaScript principal (carga de artículos)
├── components.js                 # Componentes reutilizables (header, footer)
├── functions/
│   ├── api.js                    # Funciones para consumir API
│   └── utils.js                  # Utilidades (formateo de fechas, etc.)
├── assets/
│   ├── images/
│   │   ├── logo.png
│   │   ├── logo-header.png
│   │   ├── favicon.ico
│   │   └── placeholder.jpg
│   ├── fonts/
│   └── icons/
├── _redirects                    # Cloudflare Pages redirects
├── _routes.json                  # Cloudflare Pages routing
└── wrangler.toml                 # Config de Cloudflare Pages
```

---

## 2. Plantillas HTML - Componentes Base

### 2.1 **Head Común (Meta, OG Tags, Estilos)**

Incluir en TODAS las páginas:

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <!-- Meta básico -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Sitio de noticias actualizadas">
    <meta name="author" content="Mi Sitio Noticias">
    <meta name="keywords" content="noticias, actualidad, México">
    
    <!-- Canonical URL (para SEO) -->
    <link rel="canonical" href="https://misite.com">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    
    <!-- Open Graph (redes sociales) -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Mi Sitio Noticias">
    <meta property="og:image" content="https://misite.com/assets/images/og-image.jpg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@misite">
    
    <!-- Fonts (Google Fonts o similar) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
    
    <!-- Font Awesome (íconos) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Estilos CSS (en orden) -->
    <link rel="stylesheet" href="/style.css">        <!-- Layout principal -->
    <link rel="stylesheet" href="/article.css">     <!-- Estilos artículos -->
    <link rel="stylesheet" href="/style-custom.css"> <!-- Personalizados -->
    
    <!-- Title dinámico por página -->
    <title id="page-title">Mi Sitio Noticias - Actualidad en México</title>
</head>
<body>
    <!-- Preloader (opcional, se puede esconder después) -->
    <div id="site-preloader" class="preloader">
        <div class="spinner"></div>
    </div>
    
    <!-- Header (se carga dinámicamente con components.js) -->
    <div id="site-header"></div>
    
    <!-- Contenido principal (por página) -->
    <main class="main-content" role="main">
        <!-- Contenido específico aquí -->
    </main>
    
    <!-- Footer (se carga dinámicamente con components.js) -->
    <div id="site-footer"></div>
    
    <!-- Scripts en orden -->
    <script src="/functions/api.js"></script>
    <script src="/functions/utils.js"></script>
    <script src="/components.js"></script>
    <script src="/script.js"></script>
</body>
</html>
```

---

## 3. Plantilla: index.html (Página Principal)

### 3.1 Estructura HTML

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title id="page-title">Mi Sitio Noticias - Actualidad en México</title>
    <meta name="description" content="Noticias actualizadas sobre nacional, economía, política y más">
    <meta property="og:type" content="website">
    <meta property="og:title" content="Mi Sitio Noticias">
    <meta property="og:description" content="Noticias actualizadas de México">
    <meta property="og:image" content="https://misite.com/assets/images/og-image.jpg">
    <meta property="og:url" content="https://misite.com/">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="article.css">
    <link rel="stylesheet" href="style-custom.css">
</head>
<body>
    <!-- Preloader -->
    <div id="site-preloader" class="preloader">
        <div class="spinner"></div>
    </div>
    
    <!-- Header dinámico -->
    <div id="site-header"></div>
    
    <!-- Hero Banner (opcional) -->
    <section class="hero-banner">
        <div class="hero-content">
            <h1>Últimas Noticias</h1>
            <p>Mantente informado de lo que sucede en México</p>
        </div>
    </section>
    
    <!-- Navegación de categorías -->
    <nav class="category-nav">
        <div class="container">
            <a href="categoria/nacional.html" class="cat-link">Nacional</a>
            <a href="categoria/economia.html" class="cat-link">Economía</a>
            <a href="categoria/politica.html" class="cat-link">Política</a>
            <a href="categoria/cultura.html" class="cat-link">Cultura</a>
            <a href="categoria/deportes.html" class="cat-link">Deportes</a>
            <a href="categoria/tecnologia.html" class="cat-link">Tecnología</a>
            <a href="categoria/index.html" class="cat-link">Todas</a>
        </div>
    </nav>
    
    <!-- Contenido principal -->
    <main class="main-content">
        <div class="container">
            <!-- Artículo destacado (primer artículo) -->
            <section class="featured-article">
                <div id="featured-content" class="featured-card">
                    <!-- Cargado dinámicamente -->
                </div>
            </section>
            
            <!-- Grid de artículos -->
            <section class="articles-section">
                <h2>Artículos Recientes</h2>
                <div id="articles-list" class="articles-grid">
                    <!-- Artículos cargados dinámicamente aquí -->
                </div>
            </section>
            
            <!-- Botón Cargar Más -->
            <div class="load-more-container" style="text-align:center;margin:40px 0;">
                <button id="load-more-btn" class="btn-load-more">Cargar más artículos</button>
            </div>
        </div>
    </main>
    
    <!-- Footer dinámico -->
    <div id="site-footer"></div>
    
    <!-- Scripts -->
    <script src="functions/api.js"></script>
    <script src="functions/utils.js"></script>
    <script src="components.js"></script>
    
    <!-- Lógica de página principal -->
    <script>
    (async function() {
        loadComponents(); // Carga header y footer
        
        let currentPage = 0;
        const articlesPerPage = 12;
        
        async function loadArticles(page = 0) {
            try {
                const response = await fetch(
                    `https://cms-misite.sebastianvernis.workers.dev/api/articles?limit=${articlesPerPage}&page=${page}`
                );
                const data = await response.json();
                
                if (!data.articles || data.articles.length === 0) {
                    if (page === 0) {
                        document.getElementById('articles-list').innerHTML = 
                            '<p style="grid-column:1/-1;text-align:center;">No hay artículos disponibles</p>';
                    }
                    document.getElementById('load-more-btn').style.display = 'none';
                    return;
                }
                
                // Primer artículo como destacado
                if (page === 0 && data.articles.length > 0) {
                    renderFeaturedArticle(data.articles[0]);
                }
                
                // Resto como grid
                const startIdx = page === 0 ? 1 : 0;
                renderArticlesGrid(data.articles.slice(startIdx));
                
                // Mostrar/esconder botón "Cargar más"
                document.getElementById('load-more-btn').style.display = 
                    data.articles.length < articlesPerPage ? 'none' : 'block';
                    
                currentPage = page;
            } catch (error) {
                console.error('Error cargando artículos:', error);
                document.getElementById('articles-list').innerHTML = 
                    '<p style="grid-column:1/-1;text-align:center;color:red;">Error cargando artículos</p>';
            }
        }
        
        function renderFeaturedArticle(article) {
            const featured = document.getElementById('featured-content');
            featured.innerHTML = `
                <a href="articulo/?slug=${encodeURIComponent(article.slug)}" class="featured-link">
                    <img src="${article.imageUrl}" alt="${article.title}" class="featured-image" loading="lazy">
                    <div class="featured-overlay">
                        <span class="featured-badge">${article.category || 'NACIONAL'}</span>
                        <h2 class="featured-title">${escapeHtml(article.title)}</h2>
                        <p class="featured-excerpt">${escapeHtml(article.excerpt || '')}</p>
                        <small class="featured-date">${formatDate(article.publishedAt)}</small>
                    </div>
                </a>
            `;
        }
        
        function renderArticlesGrid(articles) {
            const container = document.getElementById('articles-list');
            const html = articles.map(article => `
                <div class="article-card">
                    <a href="articulo/?slug=${encodeURIComponent(article.slug)}" class="card-link">
                        <div class="card-image-wrapper">
                            <img src="${article.imageUrl}" alt="${article.title}" loading="lazy">
                        </div>
                        <div class="card-content">
                            <span class="card-badge cat-${(article.category || 'nacional').toLowerCase()}">${article.category || 'NACIONAL'}</span>
                            <h3 class="card-title">${escapeHtml(article.title)}</h3>
                            <p class="card-excerpt">${escapeHtml(article.excerpt || '')}</p>
                            <small class="card-date">${formatDate(article.publishedAt)}</small>
                        </div>
                    </a>
                </div>
            `).join('');
            
            if (currentPage === 0) {
                container.innerHTML = html;
            } else {
                container.innerHTML += html;
            }
        }
        
        // Cargar artículos iniciales
        loadArticles(0);
        
        // Botón "Cargar más"
        document.getElementById('load-more-btn').addEventListener('click', () => {
            loadArticles(currentPage + 1);
        });
        
        // Esconder preloader cuando cargue
        setTimeout(() => {
            const preloader = document.getElementById('site-preloader');
            if (preloader) preloader.style.display = 'none';
        }, 800);
    })();
    </script>
</body>
</html>
```

---

## 4. Plantilla: articulo/index.html (Artículo Individual)

### 4.1 Estructura HTML

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title id="page-title">Artículo - Mi Sitio Noticias</title>
    <meta name="description" id="page-desc" content="Artículo de noticias">
    
    <!-- OG Tags dinámicos -->
    <meta property="og:type" content="article">
    <meta property="og:title" id="og-title" content="Artículo">
    <meta property="og:description" id="og-desc" content="">
    <meta property="og:image" id="og-image" content="">
    <meta property="og:url" id="og-url" content="">
    <meta property="og:site_name" content="Mi Sitio Noticias">
    
    <!-- Article specific tags -->
    <meta property="article:published_time" id="article-published" content="">
    <meta property="article:author" id="article-author" content="">
    <meta property="article:section" id="article-section" content="">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" id="twitter-title" content="">
    <meta name="twitter:description" id="twitter-desc" content="">
    <meta name="twitter:image" id="twitter-image" content="">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <link rel="stylesheet" href="../style.css">
    <link rel="stylesheet" href="../article.css">
    <link rel="stylesheet" href="../style-custom.css">
</head>
<body>
    <!-- Preloader -->
    <div id="site-preloader" class="preloader">
        <div class="spinner"></div>
    </div>
    
    <!-- Header dinámico -->
    <div id="site-header"></div>
    
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
        <div class="container">
            <a href="../index.html">Inicio</a>
            <span class="separator">/</span>
            <a id="breadcrumb-category" href="../categoria/nacional.html">Categoría</a>
            <span class="separator">/</span>
            <span id="breadcrumb-title">Artículo</span>
        </div>
    </nav>
    
    <!-- Contenido principal -->
    <main class="main-content article-page">
        <div class="container">
            <!-- Estado de carga -->
            <div id="article-loading" class="article-loading">
                <p>Cargando artículo...</p>
            </div>
            
            <!-- Estado de error -->
            <div id="article-error" class="article-error" style="display:none;">
                <div style="text-align:center;padding:60px 20px;">
                    <h2>Artículo no encontrado</h2>
                    <p style="color:#aaa;margin:20px 0;">
                        El artículo que buscas no está disponible o ha sido eliminado.
                    </p>
                    <a href="../index.html" class="btn-back">
                        <i class="fas fa-arrow-left"></i> Volver al inicio
                    </a>
                </div>
            </div>
            
            <!-- Artículo -->
            <article id="article-content" class="article-full" style="display:none;">
                <!-- Header del artículo -->
                <div class="article-header">
                    <!-- Categoría badge -->
                    <span id="art-category-badge" class="article-category-badge">NACIONAL</span>
                    
                    <!-- Título -->
                    <h1 id="art-title" class="article-title">Título del artículo</h1>
                    
                    <!-- Metadata -->
                    <div class="article-meta">
                        <span class="meta-item">
                            <i class="far fa-user"></i>
                            Por <span id="art-author">Redacción</span>
                        </span>
                        <span class="meta-separator">•</span>
                        <span class="meta-item">
                            <i class="far fa-calendar"></i>
                            <span id="art-date">Fecha</span>
                        </span>
                        <span class="meta-separator">•</span>
                        <span class="meta-item">
                            <i class="far fa-clock"></i>
                            <span id="art-reading-time">5 min de lectura</span>
                        </span>
                    </div>
                </div>
                
                <!-- Imagen principal -->
                <div class="article-image-wrapper" id="art-image-wrapper">
                    <img id="art-image" class="article-image" src="" alt="" loading="lazy">
                </div>
                
                <!-- Contenido del artículo -->
                <div id="art-body" class="article-content">
                    <!-- Contenido HTML cargado dinámicamente -->
                </div>
                
                <!-- Tags -->
                <div class="article-tags" id="art-tags" style="display:none;">
                    <!-- Cargados dinámicamente -->
                </div>
                
                <!-- Divider -->
                <hr class="article-divider">
                
                <!-- Compartir en redes -->
                <div class="article-share">
                    <h4>Compartir artículo</h4>
                    <div class="share-buttons">
                        <a id="share-fb" href="#" target="_blank" rel="noopener" 
                           class="share-btn share-fb" title="Compartir en Facebook">
                            <i class="fab fa-facebook-f"></i> Facebook
                        </a>
                        <a id="share-tw" href="#" target="_blank" rel="noopener"
                           class="share-btn share-tw" title="Compartir en Twitter">
                            <i class="fab fa-twitter"></i> Twitter
                        </a>
                        <a id="share-wa" href="#" target="_blank" rel="noopener"
                           class="share-btn share-wa" title="Compartir en WhatsApp">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </a>
                        <button id="copy-link-btn" class="share-btn share-copy" title="Copiar enlace">
                            <i class="fas fa-link"></i> Copiar enlace
                        </button>
                    </div>
                </div>
                
                <!-- Back button -->
                <div class="article-footer">
                    <a href="../index.html" class="btn-back">
                        <i class="fas fa-arrow-left"></i> Volver al inicio
                    </a>
                </div>
            </article>
            
            <!-- Artículos relacionados -->
            <section class="related-articles" id="related-section" style="display:none;">
                <h3>Artículos relacionados</h3>
                <div id="related-list" class="related-grid">
                    <!-- Cargados dinámicamente -->
                </div>
            </section>
        </div>
    </main>
    
    <!-- Footer dinámico -->
    <div id="site-footer"></div>
    
    <!-- Scripts -->
    <script src="../functions/api.js"></script>
    <script src="../functions/utils.js"></script>
    <script src="../components.js"></script>
    
    <!-- Lógica de artículo -->
    <script>
    (async function() {
        loadComponents();
        
        const params = new URLSearchParams(location.search);
        const slug = params.get('slug');
        
        if (!slug) {
            showError();
            return;
        }
        
        try {
            // ⚠️ Reemplazar con URL del worker real
            const response = await fetch(
                `https://cms-misite.sebastianvernis.workers.dev/api/articles/${encodeURIComponent(slug)}`
            );
            
            if (!response.ok) throw new Error('Artículo no encontrado');
            
            const data = await response.json();
            const article = data.article;
            
            if (!article) throw new Error('Sin datos');
            
            renderArticle(article);
            loadRelatedArticles(article.category);
        } catch (error) {
            console.error('Error:', error);
            showError();
        }
        
        function renderArticle(a) {
            // Actualizar title y meta tags
            document.title = (a.title || 'Artículo') + ' - Mi Sitio Noticias';
            document.getElementById('page-desc').content = a.excerpt || '';
            document.getElementById('og-title').content = a.title || '';
            document.getElementById('og-desc').content = a.excerpt || '';
            document.getElementById('og-image').content = a.imageUrl || '';
            document.getElementById('og-url').content = location.href;
            document.getElementById('article-published').content = a.publishedAt || '';
            document.getElementById('article-author').content = a.author || '';
            document.getElementById('article-section').content = a.category || '';
            document.getElementById('twitter-title').content = a.title || '';
            document.getElementById('twitter-desc').content = a.excerpt || '';
            document.getElementById('twitter-image').content = a.imageUrl || '';
            
            // Categoría
            const category = a.category || 'NACIONAL';
            const categorySlug = category.toLowerCase();
            const badge = document.getElementById('art-category-badge');
            badge.textContent = category;
            badge.className = `article-category-badge cat-${categorySlug}`;
            
            // Breadcrumb
            document.getElementById('breadcrumb-category').href = `../categoria/${categorySlug}.html`;
            document.getElementById('breadcrumb-category').textContent = category;
            document.getElementById('breadcrumb-title').textContent = a.title || '';
            
            // Título
            document.getElementById('art-title').textContent = a.title || '';
            
            // Autor y fecha
            document.getElementById('art-author').textContent = a.author || 'Redacción';
            document.getElementById('art-date').textContent = formatDate(a.publishedAt);
            
            // Tiempo de lectura (estimado)
            const wordCount = (a.content || '').replace(/<[^>]*>/g, '').split(/\s+/).length;
            const readingTime = Math.ceil(wordCount / 200); // ~200 palabras por minuto
            document.getElementById('art-reading-time').textContent = `${readingTime} min de lectura`;
            
            // Imagen
            const img = document.getElementById('art-image');
            if (a.imageUrl) {
                img.src = a.imageUrl;
                img.alt = a.title || 'Imagen del artículo';
                img.onerror = function() {
                    this.src = '../assets/images/placeholder.jpg';
                    this.alt = 'Imagen no disponible';
                };
            } else {
                document.getElementById('art-image-wrapper').style.display = 'none';
            }
            
            // Contenido
            const body = document.getElementById('art-body');
            let content = a.content || '';
            if (!content) {
                content = `<p>${escapeHtml(a.excerpt || '')}</p>`;
            } else if (!content.match(/<p>|<div>|<blockquote|<iframe/i)) {
                // Si no tiene HTML, envolver párrafos
                content = content
                    .split(/\n\n+/)
                    .map(p => `<p>${escapeHtml(p.trim())}</p>`)
                    .join('');
            }
            body.innerHTML = content;
            
            // Links para compartir
            const url = encodeURIComponent(location.href);
            const text = encodeURIComponent(a.title || '');
            document.getElementById('share-fb').href = 
                `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            document.getElementById('share-tw').href = 
                `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
            document.getElementById('share-wa').href = 
                `https://wa.me/?text=${text}%20${url}`;
            
            // Copiar enlace
            document.getElementById('copy-link-btn').addEventListener('click', function() {
                navigator.clipboard.writeText(location.href);
                this.textContent = '✓ Copiado';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-link"></i> Copiar enlace';
                }, 2000);
            });
            
            // Mostrar contenido, esconder carga
            document.getElementById('article-loading').style.display = 'none';
            document.getElementById('article-content').style.display = 'block';
            document.getElementById('site-preloader').style.display = 'none';
        }
        
        async function loadRelatedArticles(category) {
            try {
                const response = await fetch(
                    `https://cms-misite.sebastianvernis.workers.dev/api/articles?category=${encodeURIComponent(category)}&limit=3`
                );
                const data = await response.json();
                
                if (!data.articles || data.articles.length === 0) return;
                
                const related = document.getElementById('related-list');
                related.innerHTML = data.articles.map(a => `
                    <div class="related-card">
                        <a href="?slug=${encodeURIComponent(a.slug)}">
                            <img src="${a.imageUrl}" alt="${a.title}" loading="lazy">
                            <h4>${escapeHtml(a.title)}</h4>
                            <small>${formatDate(a.publishedAt)}</small>
                        </a>
                    </div>
                `).join('');
                
                document.getElementById('related-section').style.display = 'block';
            } catch (error) {
                console.error('Error cargando relacionados:', error);
            }
        }
        
        function showError() {
            document.getElementById('article-loading').style.display = 'none';
            document.getElementById('article-error').style.display = 'block';
            document.getElementById('site-preloader').style.display = 'none';
        }
    })();
    </script>
</body>
</html>
```

---

## 5. Plantilla: categoria/index.html (Listado de Categorías)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Categorías - Mi Sitio Noticias</title>
    <meta name="description" content="Navega por todas las categorías de noticias">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <link rel="stylesheet" href="../style.css">
    <link rel="stylesheet" href="../style-custom.css">
</head>
<body>
    <div id="site-header"></div>
    
    <main class="main-content">
        <div class="container">
            <h1>Todas las Categorías</h1>
            <p class="subtitle">Selecciona una categoría para ver sus artículos</p>
            
            <div class="categories-grid">
                <a href="nacional.html" class="category-card cat-nacional">
                    <i class="fas fa-globe"></i>
                    <h3>Nacional</h3>
                    <p>Noticias sobre México</p>
                </a>
                <a href="economia.html" class="category-card cat-economia">
                    <i class="fas fa-chart-line"></i>
                    <h3>Economía</h3>
                    <p>Finanzas y negocios</p>
                </a>
                <a href="politica.html" class="category-card cat-politica">
                    <i class="fas fa-landmark"></i>
                    <h3>Política</h3>
                    <p>Política y gobierno</p>
                </a>
                <a href="cultura.html" class="category-card cat-cultura">
                    <i class="fas fa-palette"></i>
                    <h3>Cultura</h3>
                    <p>Arte y entretenimiento</p>
                </a>
                <a href="deportes.html" class="category-card cat-deportes">
                    <i class="fas fa-trophy"></i>
                    <h3>Deportes</h3>
                    <p>Noticias deportivas</p>
                </a>
                <a href="tecnologia.html" class="category-card cat-tecnologia">
                    <i class="fas fa-microchip"></i>
                    <h3>Tecnología</h3>
                    <p>Innovación y tech</p>
                </a>
            </div>
        </div>
    </main>
    
    <div id="site-footer"></div>
    
    <script src="../functions/api.js"></script>
    <script src="../functions/utils.js"></script>
    <script src="../components.js"></script>
    <script>
    loadComponents();
    </script>
</body>
</html>
```

---

## 6. Plantilla: categoria/{nombre}.html (Artículos por Categoría)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title id="page-title">Nacional - Mi Sitio Noticias</title>
    <meta name="description" id="page-desc" content="Artículos sobre nacional">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <link rel="stylesheet" href="../style.css">
    <link rel="stylesheet" href="../article.css">
    <link rel="stylesheet" href="../style-custom.css">
</head>
<body>
    <div id="site-preloader" class="preloader"><div class="spinner"></div></div>
    <div id="site-header"></div>
    
    <nav class="breadcrumb">
        <div class="container">
            <a href="../index.html">Inicio</a>
            <span>/</span>
            <span id="breadcrumb-category">Categoría</span>
        </div>
    </nav>
    
    <main class="main-content">
        <div class="container">
            <div class="category-header">
                <h1 id="category-title">Nacional</h1>
                <p id="category-desc" class="category-subtitle">
                    Mantente informado sobre noticias nacionales
                </p>
            </div>
            
            <!-- Filtros (opcional) -->
            <div class="filters" style="margin-bottom:30px;">
                <select id="sort-select" style="padding:8px 12px;border:1px solid #ddd;border-radius:4px;">
                    <option value="newest">Más recientes</option>
                    <option value="oldest">Más antiguos</option>
                </select>
            </div>
            
            <!-- Grid de artículos -->
            <div id="articles-list" class="articles-grid">
                <!-- Cargados dinámicamente -->
            </div>
            
            <!-- Cargar más -->
            <div style="text-align:center;margin:40px 0;">
                <button id="load-more-btn" class="btn-load-more">Cargar más artículos</button>
            </div>
        </div>
    </main>
    
    <div id="site-footer"></div>
    
    <script src="../functions/api.js"></script>
    <script src="../functions/utils.js"></script>
    <script src="../components.js"></script>
    
    <script>
    (async function() {
        loadComponents();
        
        // Obtener categoría de la URL (nombre del archivo HTML)
        const pathname = location.pathname;
        const category = pathname.split('/').pop().replace('.html', '').toUpperCase();
        const categoryDisplay = category.charAt(0) + category.slice(1).toLowerCase();
        
        // Actualizar títulos
        document.title = `${categoryDisplay} - Mi Sitio Noticias`;
        document.getElementById('category-title').textContent = categoryDisplay;
        document.getElementById('breadcrumb-category').textContent = categoryDisplay;
        document.getElementById('page-desc').content = `Artículos sobre ${categoryDisplay}`;
        
        let currentPage = 0;
        const articlesPerPage = 12;
        
        async function loadArticles(page = 0) {
            try {
                const response = await fetch(
                    `https://cms-misite.sebastianvernis.workers.dev/api/articles?category=${encodeURIComponent(category)}&limit=${articlesPerPage}&page=${page}`
                );
                const data = await response.json();
                
                if (!data.articles || data.articles.length === 0) {
                    if (page === 0) {
                        document.getElementById('articles-list').innerHTML = 
                            `<p style="grid-column:1/-1;text-align:center;">No hay artículos en ${categoryDisplay}</p>`;
                    }
                    document.getElementById('load-more-btn').style.display = 'none';
                    return;
                }
                
                renderArticles(data.articles, page === 0);
                document.getElementById('load-more-btn').style.display = 
                    data.articles.length < articlesPerPage ? 'none' : 'block';
                    
                currentPage = page;
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('articles-list').innerHTML = 
                    '<p style="grid-column:1/-1;text-align:center;color:red;">Error cargando artículos</p>';
            }
        }
        
        function renderArticles(articles, replace = true) {
            const html = articles.map(a => `
                <div class="article-card">
                    <a href="../articulo/?slug=${encodeURIComponent(a.slug)}">
                        <img src="${a.imageUrl}" alt="${a.title}" loading="lazy">
                        <div class="card-content">
                            <span class="card-badge">${a.category || 'NACIONAL'}</span>
                            <h3>${escapeHtml(a.title)}</h3>
                            <p>${escapeHtml(a.excerpt || '')}</p>
                            <small>${formatDate(a.publishedAt)}</small>
                        </div>
                    </a>
                </div>
            `).join('');
            
            const container = document.getElementById('articles-list');
            if (replace) {
                container.innerHTML = html;
            } else {
                container.innerHTML += html;
            }
        }
        
        loadArticles(0);
        
        document.getElementById('load-more-btn').addEventListener('click', () => {
            loadArticles(currentPage + 1);
        });
        
        // Ordenamiento
        document.getElementById('sort-select').addEventListener('change', (e) => {
            // Nota: requiere parámetro sort en API
            console.log('Ordenar por:', e.target.value);
        });
        
        setTimeout(() => {
            const preloader = document.getElementById('site-preloader');
            if (preloader) preloader.style.display = 'none';
        }, 800);
    })();
    </script>
</body>
</html>
```

---

## 7. Archivo: components.js (Componentes Reutilizables)

```javascript
// components.js — Componentes comunes (header, footer, etc.)

async function loadComponents() {
    // Reemplazar con URLs reales del worker
    const WORKER_URL = 'https://cms-misite.sebastianvernis.workers.dev';
    
    // Cargar header
    const headerHtml = `
        <header class="site-header">
            <div class="container header-container">
                <a href="/" class="logo">
                    <img src="/assets/images/logo-header.png" alt="Logo">
                    <span>Mi Sitio Noticias</span>
                </a>
                <nav class="nav-menu">
                    <a href="/">Inicio</a>
                    <a href="/categoria/nacional.html">Nacional</a>
                    <a href="/categoria/economia.html">Economía</a>
                    <a href="/categoria/politica.html">Política</a>
                    <a href="/categoria/index.html">Todas</a>
                </nav>
                <button id="menu-toggle" class="menu-toggle">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        </header>
    `;
    
    const footerHtml = `
        <footer class="site-footer">
            <div class="container footer-container">
                <div class="footer-section">
                    <h4>Sobre nosotros</h4>
                    <p>Somos un sitio de noticias dedicado a mantenerte informado sobre lo que sucede en México.</p>
                </div>
                <div class="footer-section">
                    <h4>Enlaces rápidos</h4>
                    <ul>
                        <li><a href="/acerca-de.html">Acerca de</a></li>
                        <li><a href="/contacto.html">Contacto</a></li>
                        <li><a href="/privacidad.html">Privacidad</a></li>
                        <li><a href="/terminos.html">Términos</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Síguenos</h4>
                    <div class="social-links">
                        <a href="https://facebook.com/misite" target="_blank"><i class="fab fa-facebook"></i></a>
                        <a href="https://twitter.com/misite" target="_blank"><i class="fab fa-twitter"></i></a>
                        <a href="https://instagram.com/misite" target="_blank"><i class="fab fa-instagram"></i></a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 Mi Sitio Noticias. Todos los derechos reservados.</p>
            </div>
        </footer>
    `;
    
    document.getElementById('site-header').innerHTML = headerHtml;
    document.getElementById('site-footer').innerHTML = footerHtml;
    
    // Menu responsivo
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            document.querySelector('.nav-menu').classList.toggle('active');
        });
    }
}
```

---

## 8. Archivo: functions/api.js (Funciones de API)

```javascript
// functions/api.js — Funciones para consumir la API del worker

const API_BASE_URL = 'https://cms-misite.sebastianvernis.workers.dev/api';

// ⚠️ Reemplazar con URL real del worker

async function fetchArticles(options = {}) {
    const {
        limit = 12,
        page = 0,
        category = null,
        search = null,
        sort = 'newest'
    } = options;
    
    const params = new URLSearchParams();
    params.append('limit', limit);
    params.append('page', page);
    
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (sort !== 'newest') params.append('sort', sort);
    
    try {
        const response = await fetch(`${API_BASE_URL}/articles?${params}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching articles:', error);
        return { articles: [], error: error.message };
    }
}

async function fetchArticle(slug) {
    try {
        const response = await fetch(`${API_BASE_URL}/articles/${encodeURIComponent(slug)}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching article:', error);
        return { error: error.message };
    }
}

async function searchArticles(query) {
    return fetchArticles({ search: query, limit: 20 });
}

async function fetchCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching categories:', error);
        return { categories: [] };
    }
}
```

---

## 9. Archivo: functions/utils.js (Utilidades)

```javascript
// functions/utils.js — Funciones utilitarias

/**
 * Formatea una fecha ISO 8601 a formato legible español
 * @param {string} dateString - Fecha en formato ISO (2026-04-20T...)
 * @returns {string} - Fecha formateada (20 de abril de 2026)
 */
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    return date.toLocaleDateString('es-MX', options);
}

/**
 * Escapa caracteres HTML para evitar XSS
 * @param {string} text - Texto a escapar
 * @returns {string} - Texto escapado
 */
function escapeHtml(text) {
    if (!text) return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Trunca un texto a un número máximo de caracteres
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Máximo de caracteres
 * @returns {string} - Texto truncado con "..."
 */
function truncateText(text, maxLength = 150) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

/**
 * Calcula tiempo de lectura aproximado
 * @param {string} content - Contenido HTML/texto
 * @returns {number} - Minutos estimados
 */
function estimateReadingTime(content) {
    if (!content) return 1;
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    return Math.ceil(wordCount / 200); // ~200 palabras por minuto
}

/**
 * Debounce para funciones llamadas frecuentemente
 * @param {Function} func - Función a ejecutar
 * @param {number} delay - Milisegundos de espera
 * @returns {Function} - Función con debounce
 */
function debounce(func, delay = 300) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

/**
 * Detecta si estamos en dispositivo móvil
 * @returns {boolean}
 */
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
```

---

## 10. Archivo: style.css (Estilos Principales)

```css
/* style.css — Estilos principales del sitio */

:root {
    /* Colores */
    --color-primary: #3A809F;
    --color-secondary: #2A5F7F;
    --color-accent: #FF6B6B;
    --color-text: #1a1a1a;
    --color-text-light: #666;
    --color-bg: #ffffff;
    --color-bg-light: #f8f9fa;
    --color-border: #e9ecef;
    
    /* Tipografía */
    --font-headline: 'Playfair Display', serif;
    --font-body: 'Inter', sans-serif;
    
    /* Espaciado */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;
    
    /* Tamaños de fuente */
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.5rem;
    --font-size-2xl: 2rem;
    --font-size-3xl: 2.5rem;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

html {
    scroll-behavior: smooth;
}

body {
    font-family: var(--font-body);
    color: var(--color-text);
    background-color: var(--color-bg);
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--space-md);
}

/* Header */
.site-header {
    background-color: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    sticky-top: 0;
    z-index: 100;
}

.header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md) 0;
}

.logo {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    text-decoration: none;
    color: var(--color-primary);
    font-weight: 700;
    font-size: var(--font-size-lg);
}

.logo img {
    height: 40px;
}

.nav-menu {
    display: flex;
    gap: var(--space-xl);
    list-style: none;
}

.nav-menu a {
    color: var(--color-text);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s;
}

.nav-menu a:hover {
    color: var(--color-primary);
}

.menu-toggle {
    display: none;
    background: none;
    border: none;
    font-size: var(--font-size-xl);
    cursor: pointer;
}

/* Main content */
.main-content {
    min-height: calc(100vh - 200px);
    padding: var(--space-2xl) 0;
}

/* Grid de artículos */
.articles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-lg);
    margin: var(--space-2xl) 0;
}

.article-card {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.3s, box-shadow 0.3s;
}

.article-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.article-card img {
    width: 100%;
    height: 200px;
    object-fit: cover;
}

.card-content {
    padding: var(--space-md);
}

.card-badge {
    display: inline-block;
    font-size: var(--font-size-xs);
    padding: var(--space-xs) var(--space-sm);
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: var(--space-sm);
}

.card-badge.cat-nacional { background-color: #E8F4F8; color: #003366; }
.card-badge.cat-economia { background-color: #F0E8F8; color: #660099; }
.card-badge.cat-politica { background-color: #F8E8E8; color: #990000; }
.card-badge.cat-cultura { background-color: #F8F0E8; color: #996600; }
.card-badge.cat-deportes { background-color: #E8F8E8; color: #009900; }
.card-badge.cat-tecnologia { background-color: #E8F0F8; color: #003366; }

.card-title {
    font-family: var(--font-headline);
    font-size: var(--font-size-lg);
    margin: var(--space-sm) 0;
    line-height: 1.3;
}

.card-excerpt {
    color: var(--color-text-light);
    font-size: var(--font-size-sm);
    margin: var(--space-md) 0;
}

.card-date {
    color: var(--color-text-light);
    font-size: var(--font-size-xs);
}

/* Footer */
.site-footer {
    background-color: var(--color-bg-light);
    border-top: 1px solid var(--color-border);
    margin-top: var(--space-2xl);
    padding: var(--space-2xl) 0;
}

.footer-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-2xl);
    margin-bottom: var(--space-2xl);
}

.footer-section h4 {
    margin-bottom: var(--space-md);
}

.footer-section ul {
    list-style: none;
}

.footer-section a {
    color: var(--color-text-light);
    text-decoration: none;
    display: block;
    margin: var(--space-sm) 0;
}

.footer-section a:hover {
    color: var(--color-primary);
}

.social-links {
    display: flex;
    gap: var(--space-md);
    font-size: var(--font-size-lg);
}

.footer-bottom {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-lg);
    text-align: center;
    color: var(--color-text-light);
    font-size: var(--font-size-sm);
}

/* Responsivo */
@media (max-width: 768px) {
    .nav-menu {
        display: none;
        position: absolute;
        top: 60px;
        left: 0;
        right: 0;
        flex-direction: column;
        background-color: var(--color-bg);
        border-bottom: 1px solid var(--color-border);
        gap: 0;
    }
    
    .nav-menu.active {
        display: flex;
    }
    
    .nav-menu a {
        padding: var(--space-md);
        border-bottom: 1px solid var(--color-border);
    }
    
    .menu-toggle {
        display: block;
    }
    
    .articles-grid {
        grid-template-columns: 1fr;
    }
}
```

---

## 11. Archivo: article.css (Estilos de Artículos)

```css
/* article.css — Estilos específicos para páginas de artículos */

.article-page {
    background-color: var(--color-bg);
}

.breadcrumb {
    background-color: var(--color-bg-light);
    padding: var(--space-lg) 0;
    font-size: var(--font-size-sm);
}

.breadcrumb a {
    color: var(--color-primary);
    text-decoration: none;
}

.breadcrumb a:hover {
    text-decoration: underline;
}

.breadcrumb .separator {
    margin: 0 var(--space-sm);
    color: var(--color-text-light);
}

/* Artículo completo */
.article-full {
    max-width: 800px;
    margin: var(--space-2xl) auto;
}

.article-header {
    margin-bottom: var(--space-2xl);
    text-align: center;
}

.article-category-badge {
    display: inline-block;
    font-size: var(--font-size-xs);
    padding: var(--space-sm) var(--space-md);
    border-radius: 4px;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: var(--space-md);
}

.article-category-badge.cat-nacional { background-color: #E8F4F8; color: #003366; }
.article-category-badge.cat-economia { background-color: #F0E8F8; color: #660099; }
.article-category-badge.cat-politica { background-color: #F8E8E8; color: #990000; }
.article-category-badge.cat-cultura { background-color: #F8F0E8; color: #996600; }
.article-category-badge.cat-deportes { background-color: #E8F8E8; color: #009900; }
.article-category-badge.cat-tecnologia { background-color: #E8F0F8; color: #003366; }

.article-title {
    font-family: var(--font-headline);
    font-size: var(--font-size-3xl);
    line-height: 1.2;
    margin: var(--space-lg) 0;
}

.article-meta {
    display: flex;
    justify-content: center;
    gap: var(--space-md);
    flex-wrap: wrap;
    color: var(--color-text-light);
    font-size: var(--font-size-sm);
    margin-top: var(--space-lg);
}

.meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
}

.meta-separator {
    color: var(--color-border);
}

/* Imagen de artículo */
.article-image-wrapper {
    margin: var(--space-2xl) 0;
}

.article-image {
    width: 100%;
    max-height: 500px;
    object-fit: cover;
    border-radius: 8px;
}

/* Contenido del artículo */
.article-content {
    font-size: var(--font-size-base);
    line-height: 1.8;
    color: var(--color-text);
}

.article-content p {
    margin: var(--space-lg) 0;
}

.article-content h2 {
    font-family: var(--font-headline);
    font-size: var(--font-size-2xl);
    margin: var(--space-2xl) 0 var(--space-lg) 0;
}

.article-content h3 {
    font-family: var(--font-headline);
    font-size: var(--font-size-xl);
    margin: var(--space-xl) 0 var(--space-md) 0;
}

.article-content a {
    color: var(--color-primary);
    text-decoration: none;
    border-bottom: 1px solid var(--color-primary);
}

.article-content a:hover {
    background-color: rgba(58, 128, 159, 0.1);
}

.article-content blockquote {
    border-left: 4px solid var(--color-primary);
    padding-left: var(--space-lg);
    margin: var(--space-lg) 0;
    color: var(--color-text-light);
    font-style: italic;
}

.article-content ul,
.article-content ol {
    margin: var(--space-lg) 0 var(--space-lg) var(--space-xl);
}

.article-content li {
    margin-bottom: var(--space-md);
}

/* Divider */
.article-divider {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: var(--space-2xl) 0;
}

/* Compartir */
.article-share {
    margin: var(--space-2xl) 0;
    padding: var(--space-lg);
    background-color: var(--color-bg-light);
    border-radius: 8px;
}

.article-share h4 {
    margin-bottom: var(--space-md);
}

.share-buttons {
    display: flex;
    gap: var(--space-md);
    flex-wrap: wrap;
}

.share-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: var(--color-bg);
    color: var(--color-text);
    text-decoration: none;
    cursor: pointer;
    transition: all 0.3s;
}

.share-btn:hover {
    background-color: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
}

/* Footer de artículo */
.article-footer {
    margin: var(--space-2xl) 0;
}

.btn-back {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
}

.btn-back:hover {
    text-decoration: underline;
}

/* Artículos relacionados */
.related-articles {
    margin-top: var(--space-2xl);
    padding-top: var(--space-2xl);
    border-top: 1px solid var(--color-border);
}

.related-articles h3 {
    margin-bottom: var(--space-lg);
}

.related-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-lg);
}

.related-card {
    border-radius: 8px;
    overflow: hidden;
}

.related-card a {
    text-decoration: none;
    color: inherit;
}

.related-card img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 8px;
}

.related-card h4 {
    margin: var(--space-md) 0 var(--space-sm) 0;
    font-size: var(--font-size-base);
}

/* Responsivo */
@media (max-width: 768px) {
    .article-title {
        font-size: var(--font-size-2xl);
    }
    
    .article-meta {
        justify-content: center;
    }
    
    .share-buttons {
        flex-direction: column;
    }
    
    .share-btn {
        width: 100%;
        justify-content: center;
    }
}
```

---

## 12. Convenciones y Best Practices

### Naming
- **Archivos HTML**: `index.html`, `articulo/index.html`, `contacto.html` (minúsculas, kebab-case)
- **Archivos CSS**: `style.css`, `article.css`, `style-custom.css`
- **Clases CSS**: kebab-case (`.article-card`, `.cat-nacional`)
- **IDs en HTML**: camelCase para JavaScript (`#art-title`, `#article-list`)

### Estructura de Componentes
```html
<div class="component-name">           <!-- Contenedor principal -->
    <div class="component-content">     <!-- Contenido interno -->
        <h3 class="component-title">   <!-- Título -->
        <p class="component-text">     <!-- Texto -->
    </div>
</div>
```

### Integración con API
```javascript
// URL del worker (reemplazar según sitio)
const WORKER_URL = 'https://cms-{sitio}.sebastianvernis.workers.dev';

// Usar en fetch
fetch(`${WORKER_URL}/api/articles?category=nacional&limit=12`);
```

### Colores por Categoría
```css
.cat-nacional     { --color: #003366; --bg: #E8F4F8; }
.cat-economia     { --color: #660099; --bg: #F0E8F8; }
.cat-politica     { --color: #990000; --bg: #F8E8E8; }
.cat-cultura      { --color: #996600; --bg: #F8F0E8; }
.cat-deportes     { --color: #009900; --bg: #E8F8E8; }
.cat-tecnologia   { --color: #003366; --bg: #E8F0F8; }
```

---

## 13. Checklist de Implementación

- [ ] Crear estructura de directorios
- [ ] Copiar plantillas HTML (index, artículo, categorías)
- [ ] Crear/personalizar CSS (style, article, custom)
- [ ] Implementar components.js (header, footer)
- [ ] Implementar functions/api.js
- [ ] Implementar functions/utils.js
- [ ] Actualizar WORKER_URL en todos los scripts
- [ ] Actualizar logo y assets
- [ ] Probar carga de artículos
- [ ] Verificar responsive design
- [ ] Probar compartir en redes
- [ ] Verificar meta tags y OG
- [ ] Deploy en Cloudflare Pages

---

**Última actualización**: 2026-04-20  
**Versión**: 1.0
