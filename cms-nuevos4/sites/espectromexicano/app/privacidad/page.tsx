export const metadata = {
  title: 'Privacidad — Espectro Mexicano',
  description: 'Política de privacidad de Espectro Mexicano.',
};

export default function Privacidad() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>
      <div className="prose prose-lg">
        <p>En Espectro Mexicano, respetamos tu privacidad. Esta política describe cómo 
        manejamos la información en nuestro sitio web.</p>

        <h2 className="text-xl font-bold mt-8 mb-4">Información que recopilamos</h2>
        <p>No recopilamos información personal identificable sin tu consentimiento. 
        Los datos de navegación son anónimos y se utilizan únicamente para mejorar 
        la experiencia del usuario.</p>

        <h2 className="text-xl font-bold mt-8 mb-4">Uso de cookies</h2>
        <p>Utilizamos cookies técnicas necesarias para el funcionamiento del sitio. 
        No utilizamos cookies de terceros para publicidad.</p>

        <h2 className="text-xl font-bold mt-8 mb-4">Enlaces externos</h2>
        <p>Nuestros artículos pueden contener enlaces a sitios externos. No somos 
        responsables por las prácticas de privacidad de dichos sitios.</p>
      </div>
    </div>
  );
}
