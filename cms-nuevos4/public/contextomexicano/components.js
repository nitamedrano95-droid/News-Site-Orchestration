(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';
  const SITE = 'contextomexicano';
  const SITE_NAME = 'Contexto Mexicano';
  const PRIMARY = '#0891b2';
  const ITEMS = ["Indicadores", "Macroeconomía", "Inflación", "Empleo", "Series", "Metodología"];

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="contexto-loader"><div class="contexto-bar"></div><div class="contexto-bar"></div><div class="contexto-bar"></div></div><p style="font-weight:700;color:' + PRIMARY + ';font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="contexto-ticker"><div class="ticker-contexto-left"><div class="ticker-contexto-logo"><img src="' + base + 'logo-header.png" alt="' + SITE + '"></div><div class="ticker-contexto-msg">CONTEXTO MEXICANO</div></div><div class="ticker-contexto-viewport" id="ticker-contexto-viewport"><div class="ticker-contexto-inner" id="ticker-contexto-inner"><span class="ticker-contexto-loading">Cargando...</span></div></div><div class="ticker-contexto-right"><div class="ticker-contexto-time">' + timeStr + '</div><div class="ticker-contexto-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-contexto-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos4.chispakimnueve.workers.dev/api/articles?site=' + SITE + '&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-contexto-item">' + a.title + '</a>').join('<span class="ticker-contexto-sep">•</span>');
      inner.innerHTML = items + items;
      startContextoTicker();
    } catch(e) {
      inner.innerHTML = '<span>Contexto Mexicano • Tu fuente de noticias</span>';
      startContextoTicker();
    }
  }

  function startContextoTicker() {
    const inner = document.getElementById('ticker-contexto-inner');
    const viewport = document.getElementById('ticker-contexto-viewport');
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
    const links = ITEMS.map((label, i) => '<a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '" class="nav-contexto-link' + (i === 0 ? ' active' : '') + '">' + label + '</a>').join('');
    el.innerHTML = '<header class="site-header-contexto"><nav class="header-contexto-nav"><div class="nav-contexto-inner">' + links + '</div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const footerLinks = ITEMS.slice(0, 3).map(label => '<li><a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '">' + label + '</a></li>').join('');
    el.innerHTML = '<footer class="site-footer-contexto"><div class="footer-contexto-inner"><div class="footer-contexto-grid"><div class="footer-contexto-col"><span class="footer-contexto-title">Secciones</span><ul class="footer-contexto-list">' + footerLinks + '</ul></div><div class="footer-contexto-col"><span class="footer-contexto-title">Legal</span><ul class="footer-contexto-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-contexto-bottom">© ' + new Date().getFullYear() + ' Contexto Mexicano. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
