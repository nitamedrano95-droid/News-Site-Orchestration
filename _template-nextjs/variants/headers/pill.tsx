'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Search } from 'lucide-react';
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
    <header className="sticky top-0 z-50 bg-[var(--brand-bg)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between bg-white rounded-full px-6 py-2 shadow-sm border border-gray-100">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <LogoImage src="/logo-header.png" alt="PLACEHOLDER_TITLE" className="h-7 w-auto" />
            <span className="font-bold text-base" style={{ color: 'var(--brand-dark)' }}>PLACEHOLDER_TITLE</span>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/categoria/${cat.slug}/`}
                className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-white hover:bg-[var(--brand-primary)] transition-all">{cat.name}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100"><Search className="w-4 h-4" /></button>
            <button className="md:hidden p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-white mx-4 rounded-2xl shadow-lg border border-gray-100 mt-1">
          <div className="px-4 py-3 space-y-1">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/categoria/${cat.slug}/`}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] transition-colors"
                onClick={() => setMobileOpen(false)}>{cat.name}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}