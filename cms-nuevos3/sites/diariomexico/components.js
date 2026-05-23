(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="dmxo-loader"><div class="dmxo-ring"></div><div class="dmxo-dot"></div></div><p style="font-weight:700;color:#374151;font-size:0.85em;letter-spacing:3px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const dateStr = now.getDate() + ' ' + ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    el.insertAdjacentHTML('beforebegin', '<div class="dmxo-ticker"><div class="ticker-dmxo-left"><div class="ticker-dmxo-logo"><img src="' + base + 'logo-header.png" alt="diariomexico"></div><div class="ticker-dmxo-edition">EDICIÓN DIGITAL</div></div><div class="ticker-dmxo-viewport" id="ticker-dmxo-viewport"><div class="ticker-dmxo-inner" id="ticker-dmxo-inner"><span class="ticker-loading">Cargando...</span></div></div><div class="ticker-dmxo-right"><div class="ticker-dmxo-date">' + dateStr + '</div><div class="ticker-dmxo-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-dmxo-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=diariomexico&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-dmxo-item">' + a.title + '</a>').join('<span class="ticker-dmxo-sep">•</span>');
      inner.innerHTML = items + items;
      startDmxoTicker();
    } catch(e) {
      inner.innerHTML = '<span>Diario México • Tu diario de México</span>';
      startDmxoTicker();
    }
  }

  function startDmxoTicker() {
    const inner = document.getElementById('ticker-dmxo-inner');
    const viewport = document.getElementById('ticker-dmxo-viewport');
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
    el.innerHTML = '<header class="site-header-dmxo"><div class="dmxo-header-top"><span class="dmxo-header-slogan">La verdad en cada titular</span></div><nav class="header-dmxo-nav"><div class="nav-dmxo-inner"><a href="' + base + '" class="nav-dmxo-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-dmxo-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-dmxo-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-dmxo-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-dmxo"><div class="footer-dmxo-inner"><div class="footer-dmxo-grid"><div class="footer-dmxo-col"><span class="footer-dmxo-title">Secciones</span><ul class="footer-dmxo-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-dmxo-col"><span class="footer-dmxo-title">Legal</span><ul class="footer-dmxo-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-dmxo-bottom">© ' + new Date().getFullYear() + ' Diario México. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();