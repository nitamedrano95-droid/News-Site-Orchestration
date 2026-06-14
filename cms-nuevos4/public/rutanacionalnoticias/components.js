(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';
  const SITE = 'rutanacionalnoticias';
  const SITE_NAME = 'Ruta Nacional Noticias';
  const PRIMARY = '#1e40af';
  const ITEMS = ["Crónica", "Territorio", "Memoria", "Voces", "Archivo", "Relatos"];

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="rutanaci-loader"><div class="rutanaci-bar"></div><div class="rutanaci-bar"></div><div class="rutanaci-bar"></div></div><p style="font-weight:700;color:' + PRIMARY + ';font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="rutanaci-ticker"><div class="ticker-rutanaci-left"><div class="ticker-rutanaci-logo"><img src="' + base + 'logo-header.png" alt="' + SITE + '"></div><div class="ticker-rutanaci-msg">RUTA NACIONAL NOTICIAS</div></div><div class="ticker-rutanaci-viewport" id="ticker-rutanaci-viewport"><div class="ticker-rutanaci-inner" id="ticker-rutanaci-inner"><span class="ticker-rutanaci-loading">Cargando...</span></div></div><div class="ticker-rutanaci-right"><div class="ticker-rutanaci-time">' + timeStr + '</div><div class="ticker-rutanaci-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-rutanaci-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos4.chispakimnueve.workers.dev/api/articles?site=' + SITE + '&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-rutanaci-item">' + a.title + '</a>').join('<span class="ticker-rutanaci-sep">•</span>');
      inner.innerHTML = items + items;
      startRutanaciTicker();
    } catch(e) {
      inner.innerHTML = '<span>Ruta Nacional Noticias • Tu fuente de noticias</span>';
      startRutanaciTicker();
    }
  }

  function startRutanaciTicker() {
    const inner = document.getElementById('ticker-rutanaci-inner');
    const viewport = document.getElementById('ticker-rutanaci-viewport');
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
    const links = ITEMS.map((label, i) => '<a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '" class="nav-rutanaci-link' + (i === 0 ? ' active' : '') + '">' + label + '</a>').join('');
    el.innerHTML = '<header class="site-header-rutanaci"><nav class="header-rutanaci-nav"><div class="nav-rutanaci-inner">' + links + '</div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const footerLinks = ITEMS.slice(0, 3).map(label => '<li><a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '">' + label + '</a></li>').join('');
    el.innerHTML = '<footer class="site-footer-rutanaci"><div class="footer-rutanaci-inner"><div class="footer-rutanaci-grid"><div class="footer-rutanaci-col"><span class="footer-rutanaci-title">Secciones</span><ul class="footer-rutanaci-list">' + footerLinks + '</ul></div><div class="footer-rutanaci-col"><span class="footer-rutanaci-title">Legal</span><ul class="footer-rutanaci-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-rutanaci-bottom">© ' + new Date().getFullYear() + ' Ruta Nacional Noticias. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
