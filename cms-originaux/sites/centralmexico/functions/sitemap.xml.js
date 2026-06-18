import { generateSitemap } from '../../../_shared/sitemap.js'

export async function onRequest(context) {
  return generateSitemap(context, 'centralmexico', 'Central México')
}
