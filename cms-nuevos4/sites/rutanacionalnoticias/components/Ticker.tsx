'use client';
import { Zap } from 'lucide-react';
import { Article } from '@/lib/api';
interface Props { articles: Article[]; }
export default function Ticker({ articles }: Props) {
  if (!articles?.length) return null;
  return (
    <div className="bg-[var(--brand-primary)] text-white">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
        <span className="flex-shrink-0 flex items-center gap-1 text-xs font-bold uppercase bg-white/20 px-2 py-1 rounded">
          <Zap className="w-3 h-3" /> Flash
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-6 animate-scroll-x">
            {articles.slice(0, 5).map((a, i) => (
              <span key={i} className="text-sm whitespace-nowrap flex-shrink-0">{a.title}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}