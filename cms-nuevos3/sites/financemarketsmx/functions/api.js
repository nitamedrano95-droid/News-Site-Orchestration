export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Extraer el sitio del hostname
  const hostname = url.hostname;
  const siteSlug = hostname.split('.')[0];
  
  // Redirigir a la API del worker backend
  const apiUrl = `https://cms-nuevos3.workers.dev${url.pathname}?site=${siteSlug}${url.search ? '&' + url.search.slice(1) : ''}`;
  
  const init = {
    method: request.method,
    headers: new Headers(request.headers),
  };
  
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }
  
  return fetch(apiUrl, init);
}
