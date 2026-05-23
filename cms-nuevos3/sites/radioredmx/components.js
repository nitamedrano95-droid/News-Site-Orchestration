(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="rrmx-loader"><div class="rrmx-wave"></div><div class="rrmx-wave"></div><div class="rrmx-wave"></div></div><p style="font-weight:700;color:#be123c;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('beforebegin', '<div class="rrmx-ticker"><div class="ticker-rrmx-left"><div class="ticker-rrmx-logo"><img src="' + base + 'logo-header.png" alt="radioredmx"></div><div class="ticker-rrmx-label"><i class="fas fa-radio"></i>RADIO RED</div></div><div class="ticker-rrmx-viewport" id="ticker-rrmx-viewport"><div class="ticker-rrmx-inner" id="ticker-rrmx-inner"><span class="ticker-loading">Cargando...</span></div></div><div class="ticker-rrmx-right"><div class="ticker-rrmx-date">' + dateStr + '</div><div class="ticker-rrmx-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-rrmx-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=radioredmx&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-rrmx-item">' + a.title + '</a>').join('<span class="ticker-rrmx-sep">·</span>');
      inner.innerHTML = items + items;
      startRrmxTicker();
    } catch(e) {
      inner.innerHTML = '<span>Radio Red MX • La voz de México</span>';
      startRrmxTicker();
    }
  }

  function startRrmxTicker() {
    const inner = document.getElementById('ticker-rrmx-inner');
    const viewport = document.getElementById('ticker-rrmx-viewport');
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
    el.innerHTML = '<header class="site-header-rrmx"><nav class="header-rrmx-nav"><div class="nav-rrmx-inner"><a href="' + base + '" class="nav-rrmx-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-rrmx-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-rrmx-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-rrmx-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-rrmx"><div class="footer-rrmx-inner"><div class="footer-rrmx-grid"><div class="footer-rrmx-col"><span class="footer-rrmx-title">Secciones</span><ul class="footer-rrmx-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-rrmx-col"><span class="footer-rrmx-title">Radio</span><ul class="footer-rrmx-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-rrmx-col"><span class="footer-rrmx-title">Legal</span><ul class="footer-rrmx-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-rrmx-bottom">© ' + new Date().getFullYear() + ' Radio Red MX. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();