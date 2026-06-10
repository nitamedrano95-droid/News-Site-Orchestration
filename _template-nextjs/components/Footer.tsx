import Link from 'next/link';
import LogoImage from './LogoImage';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <LogoImage
                src="/logo-footer.png"
                alt="PLACEHOLDER_TITLE"
                className="h-6 w-auto"
              />
              <span className="font-bold text-white">PLACEHOLDER_TITLE</span>
            </div>
            <p className="text-sm text-gray-400">
              Información confiable y actualizada sobre los acontecimientos más importantes de México y el mundo.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white text-sm uppercase tracking-wider">Secciones</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/categoria/nacional/" className="hover:text-white transition-colors">Nacional</Link></li>
              <li><Link href="/categoria/politica/" className="hover:text-white transition-colors">Política</Link></li>
              <li><Link href="/categoria/economia/" className="hover:text-white transition-colors">Economía</Link></li>
              <li><Link href="/categoria/seguridad/" className="hover:text-white transition-colors">Seguridad</Link></li>
              <li><Link href="/categoria/mundo/" className="hover:text-white transition-colors">Mundo</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/acerca-de/" className="hover:text-white transition-colors">Acerca de</Link></li>
              <li><Link href="/contacto/" className="hover:text-white transition-colors">Contacto</Link></li>
              <li><Link href="/privacidad/" className="hover:text-white transition-colors">Privacidad</Link></li>
              <li><Link href="/terminos/" className="hover:text-white transition-colors">Términos</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-center text-gray-500">
          © {year} PLACEHOLDER_TITLE. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
