import { fetchArticles } from '@/lib/api';
import ArticleCard from '@/components/ArticleCard';
import Ticker from '@/components/Ticker';
import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';

export default async function Home() {
  const articles = await fetchArticles(13);

  if (articles.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-400 mb-2">Sin artículos</h2>
          <p className="text-gray-500">Vuelve más tarde para ver las últimas noticias.</p>
        </div>
      </div>
    );
  }

  const featured = articles[0];
  const mainGrid = articles.slice(1, 7);
  const sidebar = articles.slice(7, 13);

  return (
    <>
      <Ticker articles={articles} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured */}
        <div className="mb-10">
          <ArticleCard article={featured} variant="featured" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              <h2 className="text-xl font-bold">Últimas Noticias</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {mainGrid.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-card">
              <h3 className="font-bold text-lg mb-4 pb-3 border-b border-gray-100">
                Más Leídas
              </h3>
              <div className="space-y-4">
                {sidebar.map((article) => (
                  <ArticleCard key={article.slug} article={article} variant="compact" />
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-pastel-lila/20 to-pastel-cian/20 rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-2">Síguenos</h3>
              <p className="text-sm text-gray-600 mb-4">Mantente informado con las últimas noticias de México.</p>
              <Link
                href="#"
                className="btn-primary text-sm py-2">
                Facebook
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
