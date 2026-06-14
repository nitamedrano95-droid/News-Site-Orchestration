(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';
  const SITE = 'expresodemexico';
  const SITE_NAME = 'Expreso de México';
  const PRIMARY = '#dc2626';
  const ITEMS = ["Mundo", "Frontera", "EU", "Latinoamérica", "Europa", "Asia"];

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="expresod-loader"><div class="expresod-bar"></div><div class="expresod-bar"></div><div class="expresod-bar"></div></div><p style="font-weight:700;color:' + PRIMARY + ';font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="expresod-ticker"><div class="ticker-expresod-left"><div class="ticker-expresod-logo"><img src="' + base + 'logo-header.png" alt="' + SITE + '"></div><div class="ticker-expresod-msg">EXPRESO DE MÉXICO</div></div><div class="ticker-expresod-viewport" id="ticker-expresod-viewport"><div class="ticker-expresod-inner" id="ticker-expresod-inner"><span class="ticker-expresod-loading">Cargando...</span></div></div><div class="ticker-expresod-right"><div class="ticker-expresod-time">' + timeStr + '</div><div class="ticker-expresod-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-expresod-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos4.chispakimnueve.workers.dev/api/articles?site=' + SITE + '&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-expresod-item">' + a.title + '</a>').join('<span class="ticker-expresod-sep">•</span>');
      inner.innerHTML = items + items;
      startExpresodTicker();
    } catch(e) {
      inner.innerHTML = '<span>Expreso de México • Tu fuente de noticias</span>';
      startExpresodTicker();
    }
  }

  function startExpresodTicker() {
    const inner = document.getElementById('ticker-expresod-inner');
    const viewport = document.getElementById('ticker-expresod-viewport');
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
    const links = ITEMS.map((label, i) => '<a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '" class="nav-expresod-link' + (i === 0 ? ' active' : '') + '">' + label + '</a>').join('');
    el.innerHTML = '<header class="site-header-expresod"><nav class="header-expresod-nav"><div class="nav-expresod-inner">' + links + '</div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const footerLinks = ITEMS.slice(0, 3).map(label => '<li><a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '">' + label + '</a></li>').join('');
    el.innerHTML = '<footer class="site-footer-expresod"><div class="footer-expresod-inner"><div class="footer-expresod-grid"><div class="footer-expresod-col"><span class="footer-expresod-title">Secciones</span><ul class="footer-expresod-list">' + footerLinks + '</ul></div><div class="footer-expresod-col"><span class="footer-expresod-title">Legal</span><ul class="footer-expresod-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-expresod-bottom">© ' + new Date().getFullYear() + ' Expreso de México. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
