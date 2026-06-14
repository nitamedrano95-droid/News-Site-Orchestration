(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';
  const SITE = 'bitacorainformativa';
  const SITE_NAME = 'Bitácora Informativa';
  const PRIMARY = '#059669';
  const ITEMS = ["Crónica", "Territorio", "Memoria", "Voces", "Archivo", "Relatos"];

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="bitacora-loader"><div class="bitacora-bar"></div><div class="bitacora-bar"></div><div class="bitacora-bar"></div></div><p style="font-weight:700;color:' + PRIMARY + ';font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="bitacora-ticker"><div class="ticker-bitacora-left"><div class="ticker-bitacora-logo"><img src="' + base + 'logo-header.png" alt="' + SITE + '"></div><div class="ticker-bitacora-msg">BITÁCORA INFORMATIVA</div></div><div class="ticker-bitacora-viewport" id="ticker-bitacora-viewport"><div class="ticker-bitacora-inner" id="ticker-bitacora-inner"><span class="ticker-bitacora-loading">Cargando...</span></div></div><div class="ticker-bitacora-right"><div class="ticker-bitacora-time">' + timeStr + '</div><div class="ticker-bitacora-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-bitacora-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos4.chispakimnueve.workers.dev/api/articles?site=' + SITE + '&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-bitacora-item">' + a.title + '</a>').join('<span class="ticker-bitacora-sep">•</span>');
      inner.innerHTML = items + items;
      startBitacoraTicker();
    } catch(e) {
      inner.innerHTML = '<span>Bitácora Informativa • Tu fuente de noticias</span>';
      startBitacoraTicker();
    }
  }

  function startBitacoraTicker() {
    const inner = document.getElementById('ticker-bitacora-inner');
    const viewport = document.getElementById('ticker-bitacora-viewport');
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
    const links = ITEMS.map((label, i) => '<a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '" class="nav-bitacora-link' + (i === 0 ? ' active' : '') + '">' + label + '</a>').join('');
    el.innerHTML = '<header class="site-header-bitacora"><nav class="header-bitacora-nav"><div class="nav-bitacora-inner">' + links + '</div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const footerLinks = ITEMS.slice(0, 3).map(label => '<li><a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '">' + label + '</a></li>').join('');
    el.innerHTML = '<footer class="site-footer-bitacora"><div class="footer-bitacora-inner"><div class="footer-bitacora-grid"><div class="footer-bitacora-col"><span class="footer-bitacora-title">Secciones</span><ul class="footer-bitacora-list">' + footerLinks + '</ul></div><div class="footer-bitacora-col"><span class="footer-bitacora-title">Legal</span><ul class="footer-bitacora-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-bitacora-bottom">© ' + new Date().getFullYear() + ' Bitácora Informativa. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
