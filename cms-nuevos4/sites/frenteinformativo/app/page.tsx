import { fetchArticles } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Ticker from '@/components/Ticker';
import { TrendingUp, Newspaper, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Frente Informativo — Noticias de México',
  description: 'Noticias actualizadas de México y el mundo. Información confiable al instante.',
};

export default async function Home() {
  const articles = await fetchArticles(12);
  const featured = articles[0];
  const trending = articles.slice(1, 4);
  const grid = articles.slice(4);

  return (
    <>
      <Header />
      <main className="pt-0">
        <Ticker articles={articles} />

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {featured && <ArticleCard article={featured} variant="featured" />}
        </section>

        {/* Trending */}
        {trending.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              <h2 className="text-lg font-bold">Tendencias</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trending.map((a) => (
                <ArticleCard key={a.id} article={a} variant="default" />
              ))}
            </div>
          </section>
        )}

        {/* Main Grid + Sidebar */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <Newspaper className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            <h2 className="text-lg font-bold">Más noticias</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {grid.map((a) => (
                <ArticleCard key={a.id} article={a} variant="default" />
              ))}
            </div>
            <aside className="space-y-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-sm mb-3 uppercase tracking-wider" style={{ color: 'var(--brand-primary)' }}>Destacado</h3>
                {articles.slice(0, 5).map((a) => (
                  <ArticleCard key={a.id} article={a} variant="compact" />
                ))}
              </div>
              <div className="bg-[var(--brand-light)] rounded-xl p-5">
                <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--brand-dark)' }}>Sobre Frente Informativo</h3>
                <p className="text-sm text-gray-600">Información confiable y actualizada sobre México y el mundo.</p>
                <Link href="/acerca-de/" className="text-sm font-medium mt-3 inline-flex items-center gap-1" style={{ color: 'var(--brand-primary)' }}>
                  Conocer más <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}