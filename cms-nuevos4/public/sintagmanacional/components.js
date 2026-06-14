(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';
  const SITE = 'sintagmanacional';
  const SITE_NAME = 'Sintagma Nacional';
  const PRIMARY = '#581c87';
  const ITEMS = ["Reportajes", "Perfiles", "Ensayo", "Fotonacional", "Archivo", "Cartas"];

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="sintagma-loader"><div class="sintagma-bar"></div><div class="sintagma-bar"></div><div class="sintagma-bar"></div></div><p style="font-weight:700;color:' + PRIMARY + ';font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="sintagma-ticker"><div class="ticker-sintagma-left"><div class="ticker-sintagma-logo"><img src="' + base + 'logo-header.png" alt="' + SITE + '"></div><div class="ticker-sintagma-msg">SINTAGMA NACIONAL</div></div><div class="ticker-sintagma-viewport" id="ticker-sintagma-viewport"><div class="ticker-sintagma-inner" id="ticker-sintagma-inner"><span class="ticker-sintagma-loading">Cargando...</span></div></div><div class="ticker-sintagma-right"><div class="ticker-sintagma-time">' + timeStr + '</div><div class="ticker-sintagma-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-sintagma-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos4.chispakimnueve.workers.dev/api/articles?site=' + SITE + '&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-sintagma-item">' + a.title + '</a>').join('<span class="ticker-sintagma-sep">•</span>');
      inner.innerHTML = items + items;
      startSintagmaTicker();
    } catch(e) {
      inner.innerHTML = '<span>Sintagma Nacional • Tu fuente de noticias</span>';
      startSintagmaTicker();
    }
  }

  function startSintagmaTicker() {
    const inner = document.getElementById('ticker-sintagma-inner');
    const viewport = document.getElementById('ticker-sintagma-viewport');
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
    const links = ITEMS.map((label, i) => '<a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '" class="nav-sintagma-link' + (i === 0 ? ' active' : '') + '">' + label + '</a>').join('');
    el.innerHTML = '<header class="site-header-sintagma"><nav class="header-sintagma-nav"><div class="nav-sintagma-inner">' + links + '</div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const footerLinks = ITEMS.slice(0, 3).map(label => '<li><a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '">' + label + '</a></li>').join('');
    el.innerHTML = '<footer class="site-footer-sintagma"><div class="footer-sintagma-inner"><div class="footer-sintagma-grid"><div class="footer-sintagma-col"><span class="footer-sintagma-title">Secciones</span><ul class="footer-sintagma-list">' + footerLinks + '</ul></div><div class="footer-sintagma-col"><span class="footer-sintagma-title">Legal</span><ul class="footer-sintagma-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-sintagma-bottom">© ' + new Date().getFullYear() + ' Sintagma Nacional. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
