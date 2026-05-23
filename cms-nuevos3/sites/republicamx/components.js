(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="repub-loader"><div class="repub-bar"></div><div class="repub-bar"></div><div class="repub-bar"></div></div><p style="font-weight:700;color:#1d4ed8;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('beforebegin', '<div class="repub-ticker"><div class="ticker-repub-left"><div class="ticker-repub-logo"><img src="' + base + 'logo-header.png" alt="republicamx"></div><div class="ticker-repub-label">REPÚBLICA</div></div><div class="ticker-repub-viewport" id="ticker-repub-viewport"><div class="ticker-repub-inner" id="ticker-repub-inner"><span class="ticker-loading">Cargando...</span></div></div><div class="ticker-repub-right"><div class="ticker-repub-date">' + dateStr + '</div><div class="ticker-repub-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-repub-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=republicamx&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-repub-item">' + a.title + '</a>').join('<span class="ticker-repub-sep">·</span>');
      inner.innerHTML = items + items;
      startRepubTicker();
    } catch(e) {
      inner.innerHTML = '<span>Republica.mx • Noticias de la República Mexicana</span>';
      startRepubTicker();
    }
  }

  function startRepubTicker() {
    const inner = document.getElementById('ticker-repub-inner');
    const viewport = document.getElementById('ticker-repub-viewport');
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
    el.innerHTML = '<header class="site-header-repub"><nav class="header-repub-nav"><div class="nav-repub-inner"><a href="' + base + '" class="nav-repub-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-repub-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-repub-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-repub-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-repub"><div class="footer-repub-inner"><div class="footer-repub-grid"><div class="footer-repub-col"><span class="footer-repub-title">Secciones</span><ul class="footer-repub-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-repub-col"><span class="footer-repub-title">República</span><ul class="footer-repub-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-repub-col"><span class="footer-repub-title">Legal</span><ul class="footer-repub-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-repub-bottom">© ' + new Date().getFullYear() + ' Republica.mx. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();