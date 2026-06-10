import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Article } from '@/lib/api';
interface Props { article: Article; variant?: 'default' | 'featured' | 'compact'; }
export default function ArticleCard({ article, variant = 'default' }: Props) {
  const date = new Date(article.publishedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  if (variant === 'featured') {
    return (
      <Link href={`/articulo/?slug=${article.slug}`} className="group block col-span-full">
        <article className="relative rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className="aspect-[21/9] overflow-hidden">
            <img src={article.imageUrl || '/placeholder.jpg'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="p-6">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>{article.category}</span>
            <h2 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-[var(--brand-primary)] transition-colors">{article.title}</h2>
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">{article.excerpt}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400"><Clock className="w-3 h-3" /> {date}</div>
          </div>
        </article>
      </Link>
    );
  }
  if (variant === 'compact') {
    return (
      <Link href={`/articulo/?slug=${article.slug}`} className="group block">
        <article className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden">
            <img src={article.imageUrl || '/placeholder.jpg'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-snug group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2">{article.title}</h3>
            <span className="text-xs text-gray-400 mt-1 block">{date}</span>
          </div>
        </article>
      </Link>
    );
  }
  return (
    <Link href={`/articulo/?slug=${article.slug}`} className="group block">
      <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
        <div className="aspect-video overflow-hidden">
          <img src={article.imageUrl || '/placeholder.jpg'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
        <div className="p-4">
          <span className="text-xs font-semibold mb-2 block" style={{ color: 'var(--brand-primary)' }}>{article.category}</span>
          <h3 className="font-bold text-base leading-snug mb-2 group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2">{article.title}</h3>
          <p className="text-gray-500 text-sm line-clamp-2 mb-3">{article.excerpt}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400"><Clock className="w-3 h-3" /> {date}</div>
        </div>
      </article>
    </Link>
  );
}