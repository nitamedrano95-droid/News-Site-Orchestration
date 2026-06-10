import Link from 'next/link';
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg" style={{ color: 'var(--brand-dark)' }}>Síntesis Informativa</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <Link href="/acerca-de/" className="hover:text-[var(--brand-primary)] transition-colors">Acerca de</Link>
            <Link href="/privacidad/" className="hover:text-[var(--brand-primary)] transition-colors">Privacidad</Link>
            <Link href="/terminos/" className="hover:text-[var(--brand-primary)] transition-colors">Términos</Link>
          </nav>
          <p className="text-sm text-gray-400">© {year} Síntesis Informativa</p>
        </div>
      </div>
    </footer>
  );
}