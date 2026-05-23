(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="obsr-loader"><div class="obsr-circle"></div><div class="obsr-ring"></div></div><p style="font-weight:700;color:#3f6212;font-size:0.85em;letter-spacing:3px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="obsr-ticker"><div class="ticker-obsr-left"><a href="' + base + '" class="ticker-obsr-logo"><img src="' + base + 'logo-header.png" alt="elobservadorrepublicano"></a></div><div class="ticker-obsr-viewport" id="ticker-obsr-viewport"><div class="ticker-obsr-inner" id="ticker-obsr-inner"><span class="ticker-loading">Cargando...</span></div></div><div class="ticker-obsr-right"><div class="ticker-obsr-time">' + timeStr + '</div><div class="ticker-obsr-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-obsr-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=elobservadorrepublicano&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-obsr-item">' + a.title + '</a>').join('<span class="ticker-obsr-sep">•</span>');
      inner.innerHTML = items + items;
      startObsrTicker();
    } catch(e) {
      inner.innerHTML = '<span>El Observador Republicano • Noticias de México</span>';
      startObsrTicker();
    }
  }

  function startObsrTicker() {
    const inner = document.getElementById('ticker-obsr-inner');
    const viewport = document.getElementById('ticker-obsr-viewport');
    if (!inner || !viewport) return;
    let pos = 0;
    const speed = 0.8;
    const halfWidth = inner.scrollWidth / 2;
    function tick() {
      pos -= speed;
      if (pos <= -halfWidth) pos = 0;
      inner.style.transform = 'translateX(' + pos + 'px)';
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = '<header class="site-header-obsr"><div class="obsr-header-top"><span class="obsr-header-title">EL OBSERVADOR REPUBLICANO</span></div><nav class="header-obsr-nav"><div class="nav-obsr-inner"><a href="' + base + '" class="nav-obsr-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-obsr-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-obsr-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-obsr-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-obsr"><div class="footer-obsr-inner"><div class="footer-obsr-grid"><div class="footer-obsr-col"><span class="footer-obsr-title">Secciones</span><ul class="footer-obsr-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-obsr-col"><span class="footer-obsr-title">Más</span><ul class="footer-obsr-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-obsr-col"><span class="footer-obsr-title">Legal</span><ul class="footer-obsr-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-obsr-bottom">© ' + new Date().getFullYear() + ' El Observador Republicano. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();