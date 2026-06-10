export const metadata = {
  title: 'Acerca de — Visión Nacional Noticias',
  description: 'Conoce más sobre Visión Nacional Noticias, nuestro equipo y misión periodística.',
};

export default function AcercaDe() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Acerca de Visión Nacional Noticias</h1>
      <div className="prose prose-lg">
        <p>
          Visión Nacional Noticias es un medio de comunicación digital comprometido con la verdad y la 
          información objetiva. Nuestro equipo de periodistas trabaja día a día para llevar hasta 
          ti las noticias más importantes de México y el mundo.
        </p>
        <p>
          Fundado con la convicción de que una sociedad informada es una sociedad más fuerte, 
          cubrimos temas de política, economía, seguridad, cultura y tecnología con rigor 
          periodístico y pluralidad de voces.
        </p>
        <h2 className="text-xl font-bold mt-8 mb-4">Nuestra Misión</h2>
        <p>
          Informar con veracidad, oportunidad y equidad, contribuyendo al fortalecimiento 
          de la democracia mexicana a través de un periodismo libre, crítico y responsable.
        </p>
        <h2 className="text-xl font-bold mt-8 mb-4">Contacto</h2>
        <p>
          Para consultas, sugerencias o reportes, escríbenos a: contacto@visionnacionalnoticias.com
        </p>
      </div>
    </div>
  );
}
