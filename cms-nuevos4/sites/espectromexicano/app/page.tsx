import { fetchArticles } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Ticker from '@/components/Ticker';
import { LayoutGrid } from 'lucide-react';

export const metadata = {
  title: 'Espectro Mexicano — Noticias de México',
  description: 'Noticias actualizadas de México y el mundo. Información confiable al instante.',
};

export default async function Home() {
  const articles = await fetchArticles(12);
  const top = articles[0];
  const middle = articles.slice(1, 5);
  const bottom = articles.slice(5);

  return (
    <>
      <Header />
      <main className="pt-0">
        <Ticker articles={articles} />

        {/* Top Story */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {top && <ArticleCard article={top} variant="featured" />}
        </section>

        {/* 2x2 Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {middle.map((a) => (
              <ArticleCard key={a.id} article={a} variant="default" />
            ))}
          </div>
        </section>

        {/* Bottom Row */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            <h2 className="text-lg font-bold">Más noticias</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bottom.map((a) => (
              <ArticleCard key={a.id} article={a} variant="compact" />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}