'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Search, Sun } from 'lucide-react';
import LogoImage from './LogoImage';
const categories = [
  { name: 'Nacional', slug: 'nacional' }, { name: 'Política', slug: 'politica' },
  { name: 'Economía', slug: 'economia' }, { name: 'Seguridad', slug: 'seguridad' },
  { name: 'Mundo', slug: 'mundo' }, { name: 'Cultura', slug: 'cultura' },
  { name: 'Tecnología', slug: 'tecnologia' },
];
export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-[var(--brand-dark)] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <LogoImage src="/logo-header.png" alt="PLACEHOLDER_TITLE" className="h-8 w-auto" />
            <span className="font-bold text-lg tracking-tight">PLACEHOLDER_TITLE</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/categoria/${cat.slug}/`}
                className="px-3 py-1.5 rounded text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">{cat.name}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10"><Search className="w-5 h-5" /></button>
            <button className="md:hidden p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-[var(--brand-dark)] border-t border-white/10">
          <div className="px-4 py-3 space-y-1">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/categoria/${cat.slug}/`}
                className="block px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => setMobileOpen(false)}>{cat.name}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}