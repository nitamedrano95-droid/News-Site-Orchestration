import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Síntesis Informativa — Noticias de México',
  description: 'Noticias actualizadas de México y el mundo. Información confiable al instante.',
  keywords: ['noticias', 'México', 'actualidad', 'periodismo'],
  openGraph: {
    title: 'Síntesis Informativa',
    description: 'Noticias actualizadas de México y el mundo',
    type: 'website',
    locale: 'es_MX',
    siteName: 'Síntesis Informativa',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Síntesis Informativa',
    description: 'Noticias actualizadas de México y el mundo',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen`}>
        <Header />
        <main className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
