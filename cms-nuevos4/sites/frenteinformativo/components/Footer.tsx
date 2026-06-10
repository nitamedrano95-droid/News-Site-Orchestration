'use client';

import Link from 'next/link';
import LogoImage from './LogoImage';
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <LogoImage src="/logo-footer.png" alt="Frente Informativo" className="h-8 w-auto" />
            <span className="font-bold text-xl">Frente Informativo</span>
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
          © {year} Frente Informativo. Información confiable para México.
        </div>
      </div>
    </footer>
  );
}