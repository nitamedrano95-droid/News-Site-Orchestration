(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="wnews-loader"><div class="wnews-dot"></div><div class="wnews-dot"></div><div class="wnews-dot"></div><div class="wnews-dot"></div></div><p style="font-weight:700;color:#db2777;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('beforebegin', '<div class="wnews-ticker"><div class="ticker-wnews-left"><div class="ticker-wnews-logo"><img src="' + base + 'logo-header.png" alt="wenewsmexico"></div><div class="ticker-wnews-label"><i class="fas fa-globe"></i>WE NEWS</div></div><div class="ticker-wnews-center"><span class="ticker-wnews-static">Lo más importante de México</span></div><div class="ticker-wnews-right"><div class="ticker-wnews-date">' + dateStr + '</div><div class="ticker-wnews-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a><a href="https://wa.me/?text=' + encodeURIComponent(document.title + ' ' + window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i></a><a href="https://www.linkedin.com/shareArticle?url=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-linkedin"></i></a><a href="https://t.me/share/url?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-telegram"></i></a></div></div></div>');
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = '<header class="site-header-wnews"><nav class="header-wnews-nav"><div class="nav-wnews-inner"><a href="' + base + '" class="nav-wnews-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-wnews-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-wnews-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-wnews-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-wnews"><div class="footer-wnews-inner"><div class="footer-wnews-grid"><div class="footer-wnews-col"><span class="footer-wnews-title">Secciones</span><ul class="footer-wnews-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-wnews-col"><span class="footer-wnews-title">We</span><ul class="footer-wnews-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-wnews-col"><span class="footer-wnews-title">Legal</span><ul class="footer-wnews-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-wnews-bottom">© ' + new Date().getFullYear() + ' We News Mexico. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();