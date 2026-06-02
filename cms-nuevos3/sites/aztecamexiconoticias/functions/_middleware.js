import { handleArticleRequest } from "../../_shared/article-middleware.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const { pathname } = url;
  
  // Add diagnostic header
  const newHeaders = new Headers(context.request.headers);
  newHeaders.set('X-Middleware-Test', 'functions-working');
  
  const modifiedRequest = new Request(context.request, { headers: newHeaders });
  const modifiedContext = { ...context, request: modifiedRequest };
  
  if (!pathname.startsWith("/articulo")) {
    return await context.next();
  }
  return handleArticleRequest(modifiedContext, "aztecamexiconoticias");
}
