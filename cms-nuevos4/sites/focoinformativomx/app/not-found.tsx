export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-400 mb-2">Página no encontrada</h2>
        <p className="text-gray-500 mb-6">El artículo o sección que buscas no existe.</p>
        <a href="/" className="btn-primary">Volver al inicio</a>
      </div>
    </div>
  );
}
