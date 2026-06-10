'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Share2 } from 'lucide-react';
import { Article, fetchArticle } from '@/lib/api';

export default function ArticleContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  const [article, setArticle] = useState<Article | null | 'loading'>('loading');

  useEffect(() => {
    if (!slug) {
      setArticle(null);
      return;
    }
    fetchArticle(slug).then((a) => setArticle(a));
  }, [slug]);

  if (article === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-400">Cargando artículo...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-400 mb-2">Artículo no encontrado</h2>
          <p className="text-gray-500">El artículo que buscas no existe o fue eliminado.</p>
          <Link href="/" className="btn-primary mt-4 inline-block">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const date = new Date(article.publishedAt).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver al inicio
      </Link>

      <div className="flex items-center gap-3 mb-4">
        <span className="category-badge" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
          {article.category}
        </span>
        <span className="text-sm text-gray-500">{date}</span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">{article.title}</h1>

      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center font-bold">
            {(article.author || 'R').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{article.author || 'Redacción'}</p>
            <p className="text-xs text-gray-500">Frente Informativo</p>
          </div>
        </div>
        <button className="ml-auto p-2 rounded-lg hover:bg-gray-100">
          <Share2 className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {article.imageUrl && (
        <div className="rounded-2xl overflow-hidden mb-8 aspect-video">
          <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div
        className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-[var(--brand-primary)]"
        dangerouslySetInnerHTML={{ __html: article.content || article.excerpt }}
      />

      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Fuente: {article.source}
        </p>
      </div>
    </article>
  );
}
