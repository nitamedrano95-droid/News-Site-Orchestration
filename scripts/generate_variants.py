#!/usr/bin/env python3
"""Genera todas las variantes de componentes para los 25 sitios."""
import os
from pathlib import Path

BASE = Path.home() / "projects/News-Site-Orchestration/_template-nextjs/variants"

# ── Headers ─────────────────────────────────────────────────────────
HEADERS = {
    "classic": """'use client';
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
    <header className="sticky top-0 z-50 bg-white border-b-2 border-[var(--brand-primary)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <LogoImage src="/logo-header.png" alt="PLACEHOLDER_TITLE" className="h-9 w-auto" />
            <span className="font-bold text-xl tracking-tight" style={{ color: 'var(--brand-dark)' }}>PLACEHOLDER_TITLE</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/categoria/${cat.slug}/`}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] transition-colors">
                {cat.name}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100"><Search className="w-5 h-5" /></button>
            <button className="md:hidden p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-3 space-y-1">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/categoria/${cat.slug}/`}
                className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] transition-colors"
                onClick={() => setMobileOpen(false)}>{cat.name}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}""",

    "centered": """'use client';
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
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="flex flex-col items-center gap-2">
            <LogoImage src="/logo-header.png" alt="PLACEHOLDER_TITLE" className="h-12 w-auto" />
            <h1 className="font-bold text-2xl md:text-3xl tracking-tight text-center" style={{ color: 'var(--brand-dark)' }}>PLACEHOLDER_TITLE</h1>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/categoria/${cat.slug}/`}
                className="text-sm font-medium text-gray-600 hover:text-[var(--brand-primary)] uppercase tracking-wider transition-colors">{cat.name}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100"><Search className="w-5 h-5" /></button>
            <button className="md:hidden p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-3 space-y-1">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/categoria/${cat.slug}/`}
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-light)] transition-colors"
                onClick={() => setMobileOpen(false)}>{cat.name}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}""",

    "dark": """'use client';
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
}""",

    "pill": """'use client';
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
}""",
}

# ── Footers ─────────────────────────────────────────────────────────
FOOTERS = {
    "minimal": """import Link from 'next/link';
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg" style={{ color: 'var(--brand-dark)' }}>PLACEHOLDER_TITLE</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <Link href="/acerca-de/" className="hover:text-[var(--brand-primary)] transition-colors">Acerca de</Link>
            <Link href="/privacidad/" className="hover:text-[var(--brand-primary)] transition-colors">Privacidad</Link>
            <Link href="/terminos/" className="hover:text-[var(--brand-primary)] transition-colors">Términos</Link>
          </nav>
          <p className="text-sm text-gray-400">© {year} PLACEHOLDER_TITLE</p>
        </div>
      </div>
    </footer>
  );
}""",

    "newsgrid": """import Link from 'next/link';
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[var(--brand-dark)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="font-bold text-xl block mb-3">PLACEHOLDER_TITLE</span>
            <p className="text-sm text-gray-400">Información confiable y actualizada sobre México y el mundo.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-3 text-[var(--brand-primary)]">Secciones</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/categoria/nacional/" className="hover:text-white transition-colors">Nacional</Link></li>
              <li><Link href="/categoria/politica/" className="hover:text-white transition-colors">Política</Link></li>
              <li><Link href="/categoria/economia/" className="hover:text-white transition-colors">Economía</Link></li>
              <li><Link href="/categoria/seguridad/" className="hover:text-white transition-colors">Seguridad</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-3 text-[var(--brand-primary)]">Más</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/categoria/mundo/" className="hover:text-white transition-colors">Mundo</Link></li>
              <li><Link href="/categoria/cultura/" className="hover:text-white transition-colors">Cultura</Link></li>
              <li><Link href="/categoria/tecnologia/" className="hover:text-white transition-colors">Tecnología</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider mb-3 text-[var(--brand-primary)]">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/acerca-de/" className="hover:text-white transition-colors">Acerca de</Link></li>
              <li><Link href="/privacidad/" className="hover:text-white transition-colors">Privacidad</Link></li>
              <li><Link href="/terminos/" className="hover:text-white transition-colors">Términos</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
          © {year} PLACEHOLDER_TITLE. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}""",

    "branded": """import Link from 'next/link';
import LogoImage from './LogoImage';
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <LogoImage src="/logo-footer.png" alt="PLACEHOLDER_TITLE" className="h-8 w-auto" />
            <span className="font-bold text-xl">PLACEHOLDER_TITLE</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            <Link href="/categoria/nacional/" className="hover:text-white/80 transition-colors">Nacional</Link>
            <Link href="/categoria/politica/" className="hover:text-white/80 transition-colors">Política</Link>
            <Link href="/categoria/economia/" className="hover:text-white/80 transition-colors">Economía</Link>
            <Link href="/acerca-de/" className="hover:text-white/80 transition-colors">Acerca de</Link>
            <Link href="/privacidad/" className="hover:text-white/80 transition-colors">Privacidad</Link>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-white/30 text-center text-sm text-white/70">
          © {year} PLACEHOLDER_TITLE. Información confiable para México.
        </div>
      </div>
    </footer>
  );
}""",
}

# ── Cards ───────────────────────────────────────────────────────────
CARDS = {
    "standard": """import Link from 'next/link';
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
}""",

    "overlay": """import Link from 'next/link';
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
}""",

    "featured": """import Link from 'next/link';
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
}""",

    "compact": """import Link from 'next/link';
import { Clock } from 'lucide-react';
import { Article } from '@/lib/api';
interface Props { article: Article; variant?: 'default' | 'featured' | 'compact'; }
export default function ArticleCard({ article, variant = 'default' }: Props) {
  const date = new Date(article.publishedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  if (variant === 'featured') {
    return (
      <Link href={`/articulo/?slug=${article.slug}`} className="group block col-span-full">
        <article className="flex gap-4 md:gap-6 p-4 md:p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="w-32 md:w-48 flex-shrink-0 rounded-xl overflow-hidden">
            <img src={article.imageUrl || '/placeholder.jpg'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <span className="text-xs font-semibold mb-2" style={{ color: 'var(--brand-primary)' }}>{article.category}</span>
            <h2 className="text-lg md:text-xl font-bold mb-2 group-hover:text-[var(--brand-primary)] transition-colors">{article.title}</h2>
            <p className="text-gray-600 text-sm line-clamp-2 hidden md:block">{article.excerpt}</p>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-3"><Clock className="w-3 h-3" /> {date}</div>
          </div>
        </article>
      </Link>
    );
  }
  return (
    <Link href={`/articulo/?slug=${article.slug}`} className="group block">
      <article className="flex gap-3 p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all border-b border-gray-100 last:border-0">
        <div className="w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          <img src={article.imageUrl || '/placeholder.jpg'} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--brand-primary)' }}>{article.category}</span>
          <h3 className="font-semibold text-sm leading-snug group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2">{article.title}</h3>
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1"><Clock className="w-3 h-3" /> {date}</div>
        </div>
      </article>
    </Link>
  );
}""",
}

# ── Tickers ─────────────────────────────────────────────────────────
TICKERS = {
    "marquee": """'use client';
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
}""",

    "bar": """'use client';
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
}""",
}

# ── Layouts (page.tsx variants) ─────────────────────────────────────
LAYOUTS = {
    "magazine": """import { fetchArticles } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Ticker from '@/components/Ticker';
import { TrendingUp, Newspaper, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'PLACEHOLDER_TITLE — Noticias de México',
  description: 'Noticias actualizadas de México y el mundo. Información confiable al instante.',
};

export default async function Home() {
  const articles = await fetchArticles(12);
  const featured = articles[0];
  const trending = articles.slice(1, 4);
  const grid = articles.slice(4);

  return (
    <>
      <Header />
      <main className="pt-0">
        <Ticker articles={articles} />

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {featured && <ArticleCard article={featured} variant="featured" />}
        </section>

        {/* Trending */}
        {trending.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              <h2 className="text-lg font-bold">Tendencias</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trending.map((a) => (
                <ArticleCard key={a.id} article={a} variant="default" />
              ))}
            </div>
          </section>
        )}

        {/* Main Grid + Sidebar */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <Newspaper className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            <h2 className="text-lg font-bold">Más noticias</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {grid.map((a) => (
                <ArticleCard key={a.id} article={a} variant="default" />
              ))}
            </div>
            <aside className="space-y-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-sm mb-3 uppercase tracking-wider" style={{ color: 'var(--brand-primary)' }}>Destacado</h3>
                {articles.slice(0, 5).map((a) => (
                  <ArticleCard key={a.id} article={a} variant="compact" />
                ))}
              </div>
              <div className="bg-[var(--brand-light)] rounded-xl p-5">
                <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--brand-dark)' }}>Sobre PLACEHOLDER_TITLE</h3>
                <p className="text-sm text-gray-600">Información confiable y actualizada sobre México y el mundo.</p>
                <Link href="/acerca-de/" className="text-sm font-medium mt-3 inline-flex items-center gap-1" style={{ color: 'var(--brand-primary)' }}>
                  Conocer más <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}""",

    "editorial": """import { fetchArticles } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Ticker from '@/components/Ticker';
import { Bookmark, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'PLACEHOLDER_TITLE — Noticias de México',
  description: 'Noticias actualizadas de México y el mundo. Información confiable al instante.',
};

export default async function Home() {
  const articles = await fetchArticles(12);
  const primary = articles[0];
  const secondary = articles.slice(1, 3);
  const list = articles.slice(3, 8);

  return (
    <>
      <Header />
      <main className="pt-0">
        <Ticker articles={articles} />

        {/* Editorial Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {primary && (
              <div className="lg:row-span-2">
                <ArticleCard article={primary} variant="featured" />
              </div>
            )}
            <div className="space-y-6">
              {secondary.map((a) => (
                <ArticleCard key={a.id} article={a} variant="compact" />
              ))}
            </div>
          </div>
        </section>

        {/* Article List */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <Bookmark className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            <h2 className="text-lg font-bold">Lo último</h2>
          </div>
          <div className="space-y-2 divide-y divide-gray-100">
            {list.map((a) => (
              <ArticleCard key={a.id} article={a} variant="compact" />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/categoria/nacional/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-colors hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
              Ver más noticias <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}""",

    "newspaper": """import { fetchArticles } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Ticker from '@/components/Ticker';
import { LayoutGrid } from 'lucide-react';

export const metadata = {
  title: 'PLACEHOLDER_TITLE — Noticias de México',
  description: 'Noticias actualizadas de México y el mundo. Información confiable al instante.',
};

export default async function Home() {
  const articles = await fetchArticles(12);
  const top = articles[0];
  const middle = articles.slice(1, 5);
  const bottom = articles.slice(5);

  return (
    <>
      <Header />
      <main className="pt-0">
        <Ticker articles={articles} />

        {/* Top Story */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {top && <ArticleCard article={top} variant="featured" />}
        </section>

        {/* 2x2 Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {middle.map((a) => (
              <ArticleCard key={a.id} article={a} variant="default" />
            ))}
          </div>
        </section>

        {/* Bottom Row */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            <h2 className="text-lg font-bold">Más noticias</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bottom.map((a) => (
              <ArticleCard key={a.id} article={a} variant="compact" />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}""",

    "compact": """import { fetchArticles } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Ticker from '@/components/Ticker';
import { Rss } from 'lucide-react';

export const metadata = {
  title: 'PLACEHOLDER_TITLE — Noticias de México',
  description: 'Noticias actualizadas de México y el mundo. Información confiable al instante.',
};

export default async function Home() {
  const articles = await fetchArticles(12);

  return (
    <>
      <Header />
      <main className="pt-0">
        <Ticker articles={articles} />

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Rss className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
            <h2 className="text-lg font-bold">Feed de noticias</h2>
          </div>
          <div className="space-y-1">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} variant="compact" />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}""",
}

# ── globals.css variants ────────────────────────────────────────────
CSS_BASE = """@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand-primary: PLACEHOLDER_COLOR;
  --brand-secondary: PLACEHOLDER_SECONDARY;
  --brand-light: PLACEHOLDER_LIGHT;
  --brand-bg: PLACEHOLDER_BG;
  --brand-dark: PLACEHOLDER_DARK;
}

@layer base {
  body {
    font-family: PLACEHOLDER_FONT_FAMILY;
    background-color: var(--brand-bg, #f8f9fa);
    color: #1a1a1a;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: PLACEHOLDER_FONT_FAMILY;
  }
}

@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98];
    background-color: var(--brand-primary);
  }
  .category-badge {
    @apply inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold;
    background-color: var(--brand-light);
    color: var(--brand-primary);
  }
}

@layer utilities {
  .animate-marquee {
    animation: marquee 30s linear infinite;
  }
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-scroll-x {
    animation: scroll-x 20s linear infinite;
  }
  @keyframes scroll-x {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
"""

# ── tailwind.config.js ──────────────────────────────────────────────
TAILWIND = """/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          secondary: 'var(--brand-secondary)',
          light: 'var(--brand-light)',
          bg: 'var(--brand-bg)',
          dark: 'var(--brand-dark)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
"""

def write_file(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✓ {path.relative_to(BASE)}")

def main():
    # Headers
    for name, content in HEADERS.items():
        write_file(BASE / f"headers/{name}.tsx", content)

    # Footers
    for name, content in FOOTERS.items():
        write_file(BASE / f"footers/{name}.tsx", content)

    # Cards
    for name, content in CARDS.items():
        write_file(BASE / f"cards/{name}.tsx", content)

    # Tickers
    for name, content in TICKERS.items():
        write_file(BASE / f"tickers/{name}.tsx", content)

    # Layouts
    for name, content in LAYOUTS.items():
        write_file(BASE / f"layouts/{name}.tsx", content)

    # Base CSS
    write_file(BASE / "globals.css", CSS_BASE)
    write_file(BASE / "tailwind.config.js", TAILWIND)

    print(f"\n{'='*50}")
    print("Variantes generadas:")
    print(f"  Headers:  {len(HEADERS)}  (classic, centered, dark, pill)")
    print(f"  Footers:  {len(FOOTERS)}  (minimal, newsgrid, branded)")
    print(f"  Cards:    {len(CARDS)}    (standard, overlay, featured, compact)")
    print(f"  Tickers:  {len(TICKERS)}  (marquee, bar)")
    print(f"  Layouts:  {len(LAYOUTS)}  (magazine, editorial, newspaper, compact)")
    print(f"\nDirectorio: {BASE}")

if __name__ == '__main__':
    main()
