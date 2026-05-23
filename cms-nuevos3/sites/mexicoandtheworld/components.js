(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="maw-loader"><div class="maw-bar"></div><div class="maw-bar"></div><div class="maw-bar"></div><div class="maw-bar"></div></div><p style="font-weight:700;color:#166534;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('afterend', '<div class="maw-ticker"><div class="ticker-maw-left"><div class="ticker-maw-date">' + dateStr + '</div><div class="ticker-maw-label">MEXICO & THE WORLD</div></div><div class="ticker-maw-track" id="ticker-maw-track"><span class="ticker-loading">Cargando...</span></div><div class="ticker-maw-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div><a href="' + base + '" class="ticker-maw-logo"><img src="' + base + 'logo-header.png" alt="mexicoandtheworld"></a></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const track = document.getElementById('ticker-maw-track');
    if (!track) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=mexicoandtheworld&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { track.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-maw-item">' + a.title + '</a>').join('<span class="ticker-maw-sep">·</span>');
      track.innerHTML = items;
      startMawTicker();
    } catch(e) {
      track.innerHTML = '<span>Mexico & The World • Noticias internacionales</span>';
      startMawTicker();
    }
  }

  function startMawTicker() {
    const track = document.getElementById('ticker-maw-track');
    if (!track) return;
    let pos = 0;
    const totalWidth = track.scrollWidth / 2;
    setInterval(() => {
      pos -= 0.5;
      if (pos < -totalWidth) pos = 0;
      track.style.transform = 'translateX(' + pos + 'px)';
    }, 20);
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = '<header class="site-header-maw"><div class="maw-header-bar"><span class="maw-header-tag">MEXICO & THE WORLD</span></div><nav class="header-maw-nav"><div class="nav-maw-inner"><a href="' + base + '" class="nav-maw-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-maw-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-maw-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-maw-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-maw"><div class="footer-maw-inner"><div class="footer-maw-grid"><div class="footer-maw-col"><span class="footer-maw-title">Secciones</span><ul class="footer-maw-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-maw-col"><span class="footer-maw-title">Internacional</span><ul class="footer-maw-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-maw-col"><span class="footer-maw-title">Legal</span><ul class="footer-maw-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-maw-bottom">© ' + new Date().getFullYear() + ' Mexico & The World. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();