export async function onRequest(context) {
  const { request, params } = context;
  const { slug } = params;
  const hostname = new URL(request.url).hostname;
  const siteSlug = hostname.split('.')[0];
  
  // Obtener artículo del API del worker backend
  const apiUrl = `https://cms-nuevos3.workers.dev/api/article/${slug}?site=${siteSlug}`;
  
  const response = await fetch(apiUrl);
  const article = await response.json();
  
  // Generar HTML con SSR
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${article.title || 'Artículo'}</title>
      <meta name="description" content="${article.excerpt || ''}">
      <meta property="og:title" content="${article.title || ''}">
      <meta property="og:description" content="${article.excerpt || ''}">
      <meta property="og:image" content="${article.image || ''}">
      <meta property="og:type" content="article">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Newsreader', 'Georgia', serif;
          background: #f8f9fa;
          color: #191c1d;
          line-height: 1.8;
        }
        header {
          background: linear-gradient(135deg, #116381 0%, #2f6384 100%);
          color: white;
          padding: 40px 20px;
        }
        header a { color: white; text-decoration: none; }
        article {
          max-width: 800px;
          margin: 40px auto;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        h1 {
          font-size: 2.5em;
          margin-bottom: 20px;
          line-height: 1.3;
          color: #116381;
        }
        .meta {
          color: #70787e;
          font-size: 0.95em;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e1e3e4;
        }
        img {
          max-width: 100%;
          height: auto;
          margin: 30px 0;
          border-radius: 8px;
        }
        p {
          margin-bottom: 20px;
        }
        a { color: #116381; }
        footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e1e3e4;
          text-align: center;
          color: #70787e;
        }
      </style>
    </head>
    <body>
      <header>
        <a href="/">← Volver al inicio</a>
      </header>
      <article>
        <h1>${article.title || 'Sin título'}</h1>
        <div class="meta">
          <strong>${article.category || 'General'}</strong> • 
          ${new Date(article.createdAt || Date.now()).toLocaleDateString('es-ES')}
          ${article.author ? '• Por ' + article.author : ''}
        </div>
        ${article.image ? `<img src="${article.image}" alt="${article.title}" loading="lazy">` : ''}
        <div class="content">${article.content || article.excerpt || 'Contenido no disponible'}</div>
        <footer>
          <p>&copy; ${new Date().getFullYear()} ${article.siteName || 'Sitio de noticias'}. Todos los derechos reservados.</p>
        </footer>
      </article>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
