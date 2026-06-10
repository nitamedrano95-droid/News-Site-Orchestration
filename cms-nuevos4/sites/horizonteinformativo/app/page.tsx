import { fetchArticles } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Ticker from '@/components/Ticker';
import { Bookmark, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Horizonte Informativo — Noticias de México',
  description: 'Noticias actualizadas de México y el mundo. Información confiable al instante.',
};

export default async function Home() {
  const articles = await fetchArticles(12);
  const primary = articles[0];
  const secondary = articles.slice(1, 3);
  const list = articles.slice(3, 8);

  return (
    <>
      <Header />
      <main className="pt-0">
        <Ticker articles={articles} />

        {/* Editorial Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {primary && (
              <div className="lg:row-span-2">
                <ArticleCard article={primary} variant="featured" />
              </div>
            )}
            <div className="space-y-6">
              {secondary.map((a) => (
                <ArticleCard key={a.id} article={a} variant="compact" />
              ))}
            </div>
          </div>
        </section>

        {/* Article List */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <Bookmark className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            <h2 className="text-lg font-bold">Lo último</h2>
          </div>
          <div className="space-y-2 divide-y divide-gray-100">
            {list.map((a) => (
              <ArticleCard key={a.id} article={a} variant="compact" />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/categoria/nacional/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-colors hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
              Ver más noticias <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}