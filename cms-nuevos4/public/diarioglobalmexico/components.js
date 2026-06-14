(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';
  const SITE = 'diarioglobalmexico';
  const SITE_NAME = 'Diario Global México';
  const PRIMARY = '#0ea5e9';
  const ITEMS = ["Reportajes", "Perfiles", "Ensayo", "Fotonacional", "Archivo", "Cartas"];

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="diariogl-loader"><div class="diariogl-bar"></div><div class="diariogl-bar"></div><div class="diariogl-bar"></div></div><p style="font-weight:700;color:' + PRIMARY + ';font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="diariogl-ticker"><div class="ticker-diariogl-left"><div class="ticker-diariogl-logo"><img src="' + base + 'logo-header.png" alt="' + SITE + '"></div><div class="ticker-diariogl-msg">DIARIO GLOBAL MÉXICO</div></div><div class="ticker-diariogl-viewport" id="ticker-diariogl-viewport"><div class="ticker-diariogl-inner" id="ticker-diariogl-inner"><span class="ticker-diariogl-loading">Cargando...</span></div></div><div class="ticker-diariogl-right"><div class="ticker-diariogl-time">' + timeStr + '</div><div class="ticker-diariogl-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-diariogl-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos4.chispakimnueve.workers.dev/api/articles?site=' + SITE + '&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-diariogl-item">' + a.title + '</a>').join('<span class="ticker-diariogl-sep">•</span>');
      inner.innerHTML = items + items;
      startDiarioglTicker();
    } catch(e) {
      inner.innerHTML = '<span>Diario Global México • Tu fuente de noticias</span>';
      startDiarioglTicker();
    }
  }

  function startDiarioglTicker() {
    const inner = document.getElementById('ticker-diariogl-inner');
    const viewport = document.getElementById('ticker-diariogl-viewport');
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
    const links = ITEMS.map((label, i) => '<a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '" class="nav-diariogl-link' + (i === 0 ? ' active' : '') + '">' + label + '</a>').join('');
    el.innerHTML = '<header class="site-header-diariogl"><nav class="header-diariogl-nav"><div class="nav-diariogl-inner">' + links + '</div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const footerLinks = ITEMS.slice(0, 3).map(label => '<li><a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '">' + label + '</a></li>').join('');
    el.innerHTML = '<footer class="site-footer-diariogl"><div class="footer-diariogl-inner"><div class="footer-diariogl-grid"><div class="footer-diariogl-col"><span class="footer-diariogl-title">Secciones</span><ul class="footer-diariogl-list">' + footerLinks + '</ul></div><div class="footer-diariogl-col"><span class="footer-diariogl-title">Legal</span><ul class="footer-diariogl-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-diariogl-bottom">© ' + new Date().getFullYear() + ' Diario Global México. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
