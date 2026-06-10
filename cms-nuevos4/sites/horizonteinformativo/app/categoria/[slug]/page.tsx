import { fetchArticles } from '@/lib/api';
import ArticleCard from '@/components/ArticleCard';
import Link from 'next/link';
import { ArrowLeft, FolderOpen } from 'lucide-react';

const categoryNames: Record<string, string> = {
  nacional: 'Nacional',
  politica: 'Política',
  economia: 'Economía',
  seguridad: 'Seguridad',
  mundo: 'Mundo',
  cultura: 'Cultura',
  tecnologia: 'Tecnología',
  deportes: 'Deportes',
  entretenimiento: 'Entretenimiento',
};

export function generateStaticParams() {
  return Object.keys(categoryNames).map((slug) => ({ slug }));
}

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props) {
  const name = categoryNames[params.slug] || params.slug;
  return {
    title: `${name} — Horizonte Informativo`,
    description: `Noticias de ${name} en Horizonte Informativo`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const allArticles = await fetchArticles(50);
  const categoryName = categoryNames[params.slug] || params.slug;

  const articles = allArticles.filter(
    (a) => a.category?.toLowerCase().replace(/\s+/g, '') === params.slug.toLowerCase()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver al inicio
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <FolderOpen className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
        <h1 className="text-3xl font-bold">{categoryName}</h1>
        <span className="text-gray-500">({articles.length} artículos)</span>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No hay artículos en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
