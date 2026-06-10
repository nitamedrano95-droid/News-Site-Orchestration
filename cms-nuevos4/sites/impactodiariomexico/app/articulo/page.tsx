import { Suspense } from 'react';
import ArticleContent from './ArticleContent';

export const metadata = {
  title: 'Artículo — Impacto Diario México',
};

function ArticleFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-gray-400">Cargando artículo...</div>
    </div>
  );
}

export default function ArticlePage() {
  return (
    <Suspense fallback={<ArticleFallback />}>
      <ArticleContent />
    </Suspense>
  );
}
