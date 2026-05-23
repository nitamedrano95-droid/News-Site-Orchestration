(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="dmex-loader"><div class="dmex-bar"></div><div class="dmex-bar"></div><div class="dmex-bar"></div></div><p style="font-weight:700;color:#854d0e;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="dmex-ticker"><div class="ticker-dmex-left"><div class="ticker-dmex-logo"><img src="' + base + 'logo-header.png" alt="diariomexicano"></div><div class="ticker-dmex-msg">DIARIO MEXICANO</div></div><div class="ticker-dmex-viewport" id="ticker-dmex-viewport"><div class="ticker-dmex-inner" id="ticker-dmex-inner"><span class="ticker-loading">Cargando...</span></div></div><div class="ticker-dmex-right"><div class="ticker-dmex-time">' + timeStr + '</div><div class="ticker-dmex-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-dmex-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=diariomexicano&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-dmex-item">' + a.title + '</a>').join('<span class="ticker-dmex-sep">•</span>');
      inner.innerHTML = items + items;
      startDmexTicker();
    } catch(e) {
      inner.innerHTML = '<span>Diario Mexicano • Tu diario de México</span>';
      startDmexTicker();
    }
  }

  function startDmexTicker() {
    const inner = document.getElementById('ticker-dmex-inner');
    const viewport = document.getElementById('ticker-dmex-viewport');
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
    el.innerHTML = '<header class="site-header-dmex"><nav class="header-dmex-nav"><div class="nav-dmex-inner"><a href="' + base + '" class="nav-dmex-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-dmex-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-dmex-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-dmex-link">Economía</a><a href="' + base + 'categoria/index.html?cat=sociedad" class="nav-dmex-link">Sociedad</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-dmex"><div class="footer-dmex-inner"><div class="footer-dmex-grid"><div class="footer-dmex-col"><span class="footer-dmex-title">Secciones</span><ul class="footer-dmex-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-dmex-col"><span class="footer-dmex-title">Legal</span><ul class="footer-dmex-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-dmex-bottom">© ' + new Date().getFullYear() + ' Diario Mexicano. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();