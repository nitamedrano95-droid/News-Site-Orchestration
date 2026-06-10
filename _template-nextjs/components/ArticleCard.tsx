'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, User } from 'lucide-react';
import { Article } from '@/lib/api';

interface ArticleCardProps {
  article: Article;
  variant?: 'default' | 'featured' | 'compact';
}

export default function ArticleCard({ article, variant = 'default' }: ArticleCardProps) {
  const imageUrl = article.imageUrl || '/placeholder.jpg';
  const date = new Date(article.publishedAt).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (variant === 'featured') {
    return (
      <Link
        href={`/articulo/${article.slug}/`}
        className="article-card group block"
      >
        <div className="image-wrapper aspect-[16/9]">
          <img
            src={imageUrl}
            alt={article.title}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          <div className="absolute bottom-0 inset-x-0 p-6">
            <span className="category-badge mb-3" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
              {article.category}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-3">
              {article.title}
            </h2>
            <p className="text-gray-200 text-sm line-clamp-2 mb-3">{article.excerpt}</p>
            <div className="flex items-center gap-4 text-gray-300 text-xs">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {article.author || 'Redacción'}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {date}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        href={`/articulo/${article.slug}/`}
        className="flex gap-4 group"
      >
        <div className="w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={imageUrl}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-snug text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2">
            {article.title}
          </h4>
          <span className="text-xs text-gray-500 mt-1">{date}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/articulo/${article.slug}/`}
      className="article-card group block"
    >
      <div className="image-wrapper">
        <img
          src={imageUrl}
          alt={article.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <span className="category-badge mb-2" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
          {article.category}
        </span>
        <h3 className="font-bold text-lg leading-snug text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2 mb-2">
          {article.title}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{article.excerpt}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {article.author || 'Redacción'}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {date}</span>
        </div>
      </div>
    </Link>
  );
}
