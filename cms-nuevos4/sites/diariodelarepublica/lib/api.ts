const API_BASE = 'https://cms-nuevos4.sebastianvernis.workers.dev';
const SITE_SLUG = 'diariodelarepublica';

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  imageUrl: string | null;
  category: string;
  author: string;
  publishedAt: string;
  source: string;
  sourceUrl: string;
}

export async function fetchArticles(limit = 12): Promise<Article[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/articles?site=${SITE_SLUG}&limit=${limit}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.articles || data || [];
  } catch (e) {
    console.error('fetchArticles error:', e);
    return [];
  }
}

export async function fetchArticle(slug: string): Promise<Article | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/articles?site=${SITE_SLUG}&slug=${slug}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const articles = data.articles || data || [];
    return articles.find((a: Article) => a.slug === slug) || null;
  } catch (e) {
    console.error('fetchArticle error:', e);
    return null;
  }
}

export async function fetchArticlesByCategory(category: string, limit = 8): Promise<Article[]> {
  const all = await fetchArticles(50);
  return all.filter(a => a.category === category).slice(0, limit);
}
