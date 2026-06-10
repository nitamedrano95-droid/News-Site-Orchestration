import Link from 'next/link';
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[var(--brand-dark)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="font-bold text-xl block mb-3">Prensa Ciudadana</span>
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
          © {year} Prensa Ciudadana. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}