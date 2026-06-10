'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Search, Clock } from 'lucide-react';
import LogoImage from './LogoImage';

const categories = [
  { name: 'Nacional', slug: 'nacional' },
  { name: 'Política', slug: 'politica' },
  { name: 'Economía', slug: 'economia' },
  { name: 'Seguridad', slug: 'seguridad' },
  { name: 'Mundo', slug: 'mundo' },
  { name: 'Cultura', slug: 'cultura' },
  { name: 'Tecnología', slug: 'tecnologia' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <LogoImage
              src="/logo-header.png"
              alt="PLACEHOLDER_TITLE"
              className="h-8 w-auto"
            />
            <span className="font-bold text-lg hidden sm:block" style={{ color: 'var(--brand-primary, #1a3a5c)' }}>
              PLACEHOLDER_TITLE
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}/`}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-3 space-y-1">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categoria/${cat.slug}/`}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
