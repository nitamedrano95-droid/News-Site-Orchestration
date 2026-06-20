import { generateRobots } from '../../_shared/sitemap.js'

export async function onRequest(context) {
  const origin = new URL(context.request.url).origin
  return generateRobots(origin)
}
