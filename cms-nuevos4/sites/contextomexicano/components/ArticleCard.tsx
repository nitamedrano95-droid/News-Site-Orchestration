import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Article } from '@/lib/api';
interface Props { article: Article; variant?: 'default' | 'featured' | 'compact'; }
export default function ArticleCard({ article, variant = 'default' }: Props) {
  const date = new Date(article.publishedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  if (variant === 'featured') {
    return (
      <Link href={`/articulo/?slug=${article.slug}`} className="group block col-span-full">
        <article className="relative rounded-2xl overflow-hidden aspect-[21/9]">
          <img src={article.imageUrl || '/placeholder.jpg'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 bg-white/20 text-white backdrop-blur-sm">{article.category}</span>
            <h2 className="text-xl md:text-3xl font-bold text-white mb-2">{article.title}</h2>
            <p className="text-white/80 text-sm line-clamp-2 mb-3 max-w-2xl">{article.excerpt}</p>
            <div className="flex items-center gap-2 text-xs text-white/60"><Clock className="w-3 h-3" /> {date}</div>
          </div>
        </article>
      </Link>
    );
  }
  return (
    <Link href={`/articulo/?slug=${article.slug}`} className="group block">
      <article className="relative rounded-xl overflow-hidden aspect-[4/3]">
        <img src={article.imageUrl || '/placeholder.jpg'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className="text-xs font-semibold text-white/90 mb-1 block">{article.category}</span>
          <h3 className="font-bold text-sm text-white line-clamp-2">{article.title}</h3>
          <div className="flex items-center gap-1 text-xs text-white/60 mt-2"><Clock className="w-3 h-3" /> {date}</div>
        </div>
      </article>
    </Link>
  );
}