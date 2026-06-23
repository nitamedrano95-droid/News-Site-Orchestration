// Utilidades para parsear OG tags desde HTML

/**
 * Extrae todos los meta tags de un string HTML.
 * Devuelve { 'og:title': '...', 'og:image': '...', ... }
 */
export function parseMetaTags(html) {
  const tags = {};
  const re = /<meta[^>]+>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const prop =
      /property=["']([^"']+)["']/i.exec(tag)?.[1] ||
      /name=["']([^"']+)["']/i.exec(tag)?.[1];
    const content = /content=["']([^"']*)["']/i.exec(tag)?.[1];
    if (prop && content !== undefined) tags[prop] = content;
  }
  return tags;
}

/** Extrae el contenido del <title> */
export function parseTitle(html) {
  return /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? '';
}

/** Verifica que una URL sea HTTPS absoluta */
export function isValidHttpsUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}
