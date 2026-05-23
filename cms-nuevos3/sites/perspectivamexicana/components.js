(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="pers-loader"><div class="pers-circle"></div></div><p style="font-weight:700;color:#0f766e;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('beforebegin', '<div class="pers-ticker"><div class="ticker-pers-left"><div class="ticker-pers-logo"><img src="' + base + 'logo-header.png" alt="perspectivamexicana"></div><div class="ticker-pers-label">PERSPECTIVA</div></div><div class="ticker-pers-viewport" id="ticker-pers-viewport"><div class="ticker-pers-inner" id="ticker-pers-inner"><span class="ticker-loading">Cargando...</span></div></div><div class="ticker-pers-right"><div class="ticker-pers-date">' + dateStr + '</div><div class="ticker-pers-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-pers-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=perspectivamexicana&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-pers-item">' + a.title + '</a>').join('<span class="ticker-pers-sep">·</span>');
      inner.innerHTML = items + items;
      startPersTicker();
    } catch(e) {
      inner.innerHTML = '<span>Perspectiva Mexicana • Noticias con profundidad</span>';
      startPersTicker();
    }
  }

  function startPersTicker() {
    const inner = document.getElementById('ticker-pers-inner');
    const viewport = document.getElementById('ticker-pers-viewport');
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
    el.innerHTML = '<header class="site-header-pers"><nav class="header-pers-nav"><div class="nav-pers-inner"><a href="' + base + '" class="nav-pers-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-pers-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-pers-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-pers-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-pers"><div class="footer-pers-inner"><div class="footer-pers-grid"><div class="footer-pers-col"><span class="footer-pers-title">Secciones</span><ul class="footer-pers-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-pers-col"><span class="footer-pers-title">Análisis</span><ul class="footer-pers-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-pers-col"><span class="footer-pers-title">Legal</span><ul class="footer-pers-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-pers-bottom">© ' + new Date().getFullYear() + ' Perspectiva Mexicana. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();