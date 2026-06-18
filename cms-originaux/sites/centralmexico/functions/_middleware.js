import { handleArticleRequest } from '../../_shared/article-middleware.js';
import { generateSitemap, generateRobots } from '../../_shared/sitemap.js';

export async function onRequest(context) {
  const { pathname } = new URL(context.request.url);

  if (pathname === '/sitemap.xml') {
    return generateSitemap(context, 'centralmexico', 'Central México');
  }

  if (pathname === '/robots.txt') {
    return generateRobots(new URL(context.request.url).origin);
  }

  if (!pathname.startsWith('/articulo')) {
    return await context.next();
  }

  return handleArticleRequest(context, 'centralmexico');
}
