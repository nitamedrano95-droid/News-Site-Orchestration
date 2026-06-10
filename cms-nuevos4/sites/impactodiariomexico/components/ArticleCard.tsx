import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import { Article } from '@/lib/api';
interface Props { article: Article; variant?: 'default' | 'featured' | 'compact'; }
export default function ArticleCard({ article, variant = 'default' }: Props) {
  const date = new Date(article.publishedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  if (variant === 'featured') {
    return (
      <Link href={`/articulo/?slug=${article.slug}`} className="group block col-span-full">
        <article className="flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
          <div className="md:w-3/5 aspect-video md:aspect-auto overflow-hidden">
            <img src={article.imageUrl || '/placeholder.jpg'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="md:w-2/5 p-6 md:p-8 flex flex-col justify-center">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 w-fit" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>{article.category}</span>
            <h2 className="text-xl md:text-2xl font-bold mb-3 group-hover:text-[var(--brand-primary)] transition-colors">{article.title}</h2>
            <p className="text-gray-600 text-sm line-clamp-3 mb-4">{article.excerpt}</p>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2 text-xs text-gray-400"><Clock className="w-3 h-3" /> {date}</div>
              <span className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--brand-primary)' }}>Leer <ArrowRight className="w-4 h-4" /></span>
            </div>
          </div>
        </article>
      </Link>
    );
  }
  return (
    <Link href={`/articulo/?slug=${article.slug}`} className="group block">
      <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
        <div className="aspect-[16/10] overflow-hidden">
          <img src={article.imageUrl || '/placeholder.jpg'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--brand-primary)' }}>{article.category}</span>
          </div>
          <h3 className="font-bold text-base leading-snug mb-2 group-hover:text-[var(--brand-primary)] transition-colors">{article.title}</h3>
          <p className="text-gray-500 text-sm line-clamp-2">{article.excerpt}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-3"><Clock className="w-3 h-3" /> {date}</div>
        </div>
      </article>
    </Link>
  );
}