import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Article } from '@/lib/api';
interface Props { article: Article; variant?: 'default' | 'featured' | 'compact'; }
export default function ArticleCard({ article, variant = 'default' }: Props) {
  const date = new Date(article.publishedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  if (variant === 'featured') {
    return (
      <Link href={`/articulo/?slug=${article.slug}`} className="group block col-span-full">
        <article className="flex gap-4 md:gap-6 p-4 md:p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="w-32 md:w-48 flex-shrink-0 rounded-xl overflow-hidden">
            <img src={article.imageUrl || '/placeholder.jpg'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <span className="text-xs font-semibold mb-2" style={{ color: 'var(--brand-primary)' }}>{article.category}</span>
            <h2 className="text-lg md:text-xl font-bold mb-2 group-hover:text-[var(--brand-primary)] transition-colors">{article.title}</h2>
            <p className="text-gray-600 text-sm line-clamp-2 hidden md:block">{article.excerpt}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-3"><Clock className="w-3 h-3" /> {date}</div>
          </div>
        </article>
      </Link>
    );
  }
  return (
    <Link href={`/articulo/?slug=${article.slug}`} className="group block">
      <article className="flex gap-3 p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all border-b border-gray-100 last:border-0">
        <div className="w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          <img src={article.imageUrl || '/placeholder.jpg'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--brand-primary)' }}>{article.category}</span>
          <h3 className="font-semibold text-sm leading-snug group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2">{article.title}</h3>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1"><Clock className="w-3 h-3" /> {date}</div>
        </div>
      </article>
    </Link>
  );
}