'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Article } from '@/lib/api';

interface TickerProps {
  articles: Article[];
}

export default function Ticker({ articles }: TickerProps) {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tickerArticles = articles.slice(0, 8);
  if (tickerArticles.length === 0) return null;

  return (
    <div
      className="bg-[var(--brand-primary)] text-white py-2 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={scrollRef}
        className={`flex items-center gap-8 whitespace-nowrap ${isPaused ? '' : 'animate-ticker'}`}
        style={{
          animation: isPaused ? 'none' : 'ticker 40s linear infinite',
        }}
      >
        {[...tickerArticles, ...tickerArticles].map((article, i) => (
          <Link
            key={`${article.slug}-${i}`}
            href={`/articulo/${article.slug}/`}
            className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
          >
            <span className="w-2 h-2 rounded-full bg-white/60"></span>
            <span className="truncate max-w-md">{article.title}</span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
