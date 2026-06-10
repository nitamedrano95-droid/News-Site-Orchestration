export const metadata = {
  title: 'Términos — Síntesis Informativa',
  description: 'Términos y condiciones de uso de Síntesis Informativa.',
};

export default function Terminos() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Términos y Condiciones</h1>
      <div className="prose prose-lg">
        <p>Al acceder y utilizar Síntesis Informativa, aceptas los siguientes términos 
        y condiciones de uso.</p>

        <h2 className="text-xl font-bold mt-8 mb-4">Uso del contenido</h2>
        <p>El contenido publicado en Síntesis Informativa es de acceso público. Puedes 
        compartir nuestros artículos siempre que cites la fuente. No está permitido 
        reproducir contenido con fines comerciales sin autorización.</p>

        <h2 className="text-xl font-bold mt-8 mb-4">Responsabilidad</h2>
        <p>Síntesis Informativa no se hace responsable por el contenido de enlaces 
        externos. Las opiniones expresadas en artículos son responsabilidad de sus 
        autores.</p>

        <h2 className="text-xl font-bold mt-8 mb-4">Modificaciones</h2>
        <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. 
        Los cambios entrarán en vigor al ser publicados en esta página.</p>
      </div>
    </div>
  );
}
