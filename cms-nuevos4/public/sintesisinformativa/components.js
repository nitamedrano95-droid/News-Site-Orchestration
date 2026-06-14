(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';
  const SITE = 'sintesisinformativa';
  const SITE_NAME = 'Síntesis Informativa';
  const PRIMARY = '#6366f1';
  const ITEMS = ["Signal", "Pipeline", "Logs", "Status", "RSS", "Endpoints"];

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="sintesis-loader"><div class="sintesis-bar"></div><div class="sintesis-bar"></div><div class="sintesis-bar"></div></div><p style="font-weight:700;color:' + PRIMARY + ';font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="sintesis-ticker"><div class="ticker-sintesis-left"><div class="ticker-sintesis-logo"><img src="' + base + 'logo-header.png" alt="' + SITE + '"></div><div class="ticker-sintesis-msg">SÍNTESIS INFORMATIVA</div></div><div class="ticker-sintesis-viewport" id="ticker-sintesis-viewport"><div class="ticker-sintesis-inner" id="ticker-sintesis-inner"><span class="ticker-sintesis-loading">Cargando...</span></div></div><div class="ticker-sintesis-right"><div class="ticker-sintesis-time">' + timeStr + '</div><div class="ticker-sintesis-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-sintesis-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos4.chispakimnueve.workers.dev/api/articles?site=' + SITE + '&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-sintesis-item">' + a.title + '</a>').join('<span class="ticker-sintesis-sep">•</span>');
      inner.innerHTML = items + items;
      startSintesisTicker();
    } catch(e) {
      inner.innerHTML = '<span>Síntesis Informativa • Tu fuente de noticias</span>';
      startSintesisTicker();
    }
  }

  function startSintesisTicker() {
    const inner = document.getElementById('ticker-sintesis-inner');
    const viewport = document.getElementById('ticker-sintesis-viewport');
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
    const links = ITEMS.map((label, i) => '<a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '" class="nav-sintesis-link' + (i === 0 ? ' active' : '') + '">' + label + '</a>').join('');
    el.innerHTML = '<header class="site-header-sintesis"><nav class="header-sintesis-nav"><div class="nav-sintesis-inner">' + links + '</div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const footerLinks = ITEMS.slice(0, 3).map(label => '<li><a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '">' + label + '</a></li>').join('');
    el.innerHTML = '<footer class="site-footer-sintesis"><div class="footer-sintesis-inner"><div class="footer-sintesis-grid"><div class="footer-sintesis-col"><span class="footer-sintesis-title">Secciones</span><ul class="footer-sintesis-list">' + footerLinks + '</ul></div><div class="footer-sintesis-col"><span class="footer-sintesis-title">Legal</span><ul class="footer-sintesis-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-sintesis-bottom">© ' + new Date().getFullYear() + ' Síntesis Informativa. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
