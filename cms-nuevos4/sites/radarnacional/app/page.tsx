import { fetchArticles } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Ticker from '@/components/Ticker';
import { Rss } from 'lucide-react';

export const metadata = {
  title: 'Radar Nacional — Noticias de México',
  description: 'Noticias actualizadas de México y el mundo. Información confiable al instante.',
};

export default async function Home() {
  const articles = await fetchArticles(12);

  return (
    <>
      <Header />
      <main className="pt-0">
        <Ticker articles={articles} />

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Rss className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            <h2 className="text-lg font-bold">Feed de noticias</h2>
          </div>
          <div className="space-y-1">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} variant="compact" />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}