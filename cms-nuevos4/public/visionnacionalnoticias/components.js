(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';
  const SITE = 'visionnacionalnoticias';
  const SITE_NAME = 'Visión Nacional Noticias';
  const PRIMARY = '#7c3aed';
  const ITEMS = ["Indicadores", "Macroeconomía", "Inflación", "Empleo", "Series", "Metodología"];

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="visionna-loader"><div class="visionna-bar"></div><div class="visionna-bar"></div><div class="visionna-bar"></div></div><p style="font-weight:700;color:' + PRIMARY + ';font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="visionna-ticker"><div class="ticker-visionna-left"><div class="ticker-visionna-logo"><img src="' + base + 'logo-header.png" alt="' + SITE + '"></div><div class="ticker-visionna-msg">VISIÓN NACIONAL NOTICIAS</div></div><div class="ticker-visionna-viewport" id="ticker-visionna-viewport"><div class="ticker-visionna-inner" id="ticker-visionna-inner"><span class="ticker-visionna-loading">Cargando...</span></div></div><div class="ticker-visionna-right"><div class="ticker-visionna-time">' + timeStr + '</div><div class="ticker-visionna-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-visionna-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos4.chispakimnueve.workers.dev/api/articles?site=' + SITE + '&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-visionna-item">' + a.title + '</a>').join('<span class="ticker-visionna-sep">•</span>');
      inner.innerHTML = items + items;
      startVisionnaTicker();
    } catch(e) {
      inner.innerHTML = '<span>Visión Nacional Noticias • Tu fuente de noticias</span>';
      startVisionnaTicker();
    }
  }

  function startVisionnaTicker() {
    const inner = document.getElementById('ticker-visionna-inner');
    const viewport = document.getElementById('ticker-visionna-viewport');
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
    const links = ITEMS.map((label, i) => '<a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '" class="nav-visionna-link' + (i === 0 ? ' active' : '') + '">' + label + '</a>').join('');
    el.innerHTML = '<header class="site-header-visionna"><nav class="header-visionna-nav"><div class="nav-visionna-inner">' + links + '</div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const footerLinks = ITEMS.slice(0, 3).map(label => '<li><a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '">' + label + '</a></li>').join('');
    el.innerHTML = '<footer class="site-footer-visionna"><div class="footer-visionna-inner"><div class="footer-visionna-grid"><div class="footer-visionna-col"><span class="footer-visionna-title">Secciones</span><ul class="footer-visionna-list">' + footerLinks + '</ul></div><div class="footer-visionna-col"><span class="footer-visionna-title">Legal</span><ul class="footer-visionna-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-visionna-bottom">© ' + new Date().getFullYear() + ' Visión Nacional Noticias. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
