'use client';
import { TrendingUp } from 'lucide-react';
import { Article } from '@/lib/api';
interface Props { articles: Article[]; }
export default function Ticker({ articles }: Props) {
  if (!articles?.length) return null;
  const tickerText = articles.slice(0, 5).map(a => a.title).join('  •  ');
  return (
    <div className="bg-[var(--brand-dark)] text-white py-2 overflow-hidden">
      <div className="flex items-center gap-3 px-4 max-w-7xl mx-auto">
        <span className="flex-shrink-0 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]">
          <TrendingUp className="w-3 h-3" /> Última hora
        </span>
        <div className="overflow-hidden flex-1">
          <div className="whitespace-nowrap animate-marquee text-sm">
            {tickerText}  •  {tickerText}
          </div>
        </div>
      </div>
    </div>
  );
}