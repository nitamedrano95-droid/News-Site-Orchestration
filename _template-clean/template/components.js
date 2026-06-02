(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div class="loader"></div><p style="font-weight:700;color:PLACEHOLDER_COLOR;font-size:0.85em;letter-spacing:3px;text-transform:uppercase;margin-top:16px;">Cargando...</p>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const dateStr = now.getDate() + ' ' + ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    el.insertAdjacentHTML('beforebegin', '<div class="PLACEHOLDER_X-ticker"><div class="ticker-PLACEHOLDER_X-left"><div class="ticker-PLACEHOLDER_X-logo"><img src="' + base + 'logo-header.png" alt="PLACEHOLDER_NAME"></div><div class="ticker-PLACEHOLDER_X-edition">EDICIÓN DIGITAL</div></div><div class="ticker-PLACEHOLDER_X-viewport" id="ticker-PLACEHOLDER_X-viewport"><div class="ticker-PLACEHOLDER_X-inner" id="ticker-PLACEHOLDER_X-inner"><span class="ticker-loading">Cargando...</span></div></div><div class="ticker-PLACEHOLDER_X-right"><div class="ticker-PLACEHOLDER_X-date">' + dateStr + '</div><div class="ticker-PLACEHOLDER_X-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-PLACEHOLDER_X-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=PLACEHOLDER_NAME&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-PLACEHOLDER_X-item">' + a.title + '</a>').join('<span class="ticker-PLACEHOLDER_X-sep">•</span>');
      inner.innerHTML = items + items;
      startPLACEHOLDER_XTicker();
    } catch(e) {
      inner.innerHTML = '<span>PLACEHOLDER_TITLE • Tu diario de México</span>';
      startPLACEHOLDER_XTicker();
    }
  }

  function startPLACEHOLDER_XTicker() {
    const inner = document.getElementById('ticker-PLACEHOLDER_X-inner');
    const viewport = document.getElementById('ticker-PLACEHOLDER_X-viewport');
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
    el.innerHTML = '<header class="site-header-PLACEHOLDER_X"><div class="header-PLACEHOLDER_X-top"><span class="header-PLACEHOLDER_X-slogan">Tu fuente de noticias</span></div><nav class="header-PLACEHOLDER_X-nav"><div class="nav-PLACEHOLDER_X-inner"><a href="' + base + '" class="nav-PLACEHOLDER_X-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-PLACEHOLDER_X-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-PLACEHOLDER_X-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-PLACEHOLDER_X-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-PLACEHOLDER_X"><div class="footer-PLACEHOLDER_X-inner"><div class="footer-PLACEHOLDER_X-grid"><div class="footer-PLACEHOLDER_X-col"><span class="footer-PLACEHOLDER_X-title">Secciones</span><ul class="footer-PLACEHOLDER_X-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-PLACEHOLDER_X-col"><span class="footer-PLACEHOLDER_X-title">Legal</span><ul class="footer-PLACEHOLDER_X-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-PLACEHOLDER_X-bottom">© ' + new Date().getFullYear() + ' PLACEHOLDER_TITLE. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();