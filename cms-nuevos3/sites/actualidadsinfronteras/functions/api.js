export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  const hostname = url.hostname;
  const siteSlug = hostname.split('.')[0];
  
  const apiUrl = `https://cms-nuevos3.workers.dev${url.pathname}?site=${siteSlug}${url.search ? '&' + url.search.slice(1) : ''}`;
  
  const init = {
    method: request.method,
    headers: new Headers(request.headers),
  };
  
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }
  
  const response = await fetch(apiUrl, init);
  
  const cacheControl = response.headers.get('Cache-Control');
  if (!cacheControl) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  
  return response;
}
