(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="width:44px;height:44px;border:3px solid #e5e7eb;border-top-color:#374151;border-radius:50%;animation:spin 0.8s linear infinite;"></div><p style="margin-top:14px;font-weight:700;color:#374151;font-size:0.85em;letter-spacing:1px;">Diario Mexico</p><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = '<header style="background:linear-gradient(135deg,#374151 0%,#9ca3af 100%);color:#fff;padding:14px 0;position:sticky;top:0;z-index:100;box-shadow:0 2px 10px rgba(0,0,0,0.1);"><div class="container" style="display:flex;align-items:center;justify-content:space-between;max-width:1200px;margin:0 auto;padding:0 24px;"><a href="' + base + '" style="font-size:1.3em;font-weight:800;color:#fff;text-decoration:none;">Diario Mexico</a><nav style="display:flex;gap:20px;"><a href="' + base + '" style="color:rgba(255,255,255,0.9);text-decoration:none;font-weight:600;font-size:0.88em;">Inicio</a><a href="' + base + 'categoria/nacional.html" style="color:rgba(255,255,255,0.9);text-decoration:none;font-weight:600;font-size:0.88em;">Nacional</a><a href="' + base + 'categoria/politica.html" style="color:rgba(255,255,255,0.9);text-decoration:none;font-weight:600;font-size:0.88em;">Politica</a><a href="' + base + 'categoria/economia.html" style="color:rgba(255,255,255,0.9);text-decoration:none;font-weight:600;font-size:0.88em;">Economia</a></nav></div></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer"><p>&copy; ' + new Date().getFullYear() + ' Diario Mexico. Todos los derechos reservados.</p><p><a href="' + base + 'privacidad.html">Privacidad</a> | <a href="' + base + 'terminos.html">Terminos</a> | <a href="' + base + 'contacto.html">Contacto</a> | <a href="' + base + 'acerca-de.html">Acerca de</a></p></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
