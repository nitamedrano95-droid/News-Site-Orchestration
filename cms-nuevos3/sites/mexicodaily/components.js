(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="mdaily-loader"><div class="mdaily-pulse p1"></div><div class="mdaily-pulse p2"></div><div class="mdaily-pulse p3"></div></div><p style="font-weight:700;color:#0369a1;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('afterend', '<div class="mdaily-ticker"><a href="' + base + '" class="ticker-mdaily-logo"><img src="' + base + 'logo-header.png" alt="mexicodaily"></a><div class="ticker-mdaily-label">MEXICO DAILY</div><div class="ticker-mdaily-track" id="ticker-mdaily-track"><span class="ticker-loading">Cargando...</span></div><div class="ticker-mdaily-right"><div class="ticker-mdaily-date">' + dateStr + '</div><div class="ticker-mdaily-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const track = document.getElementById('ticker-mdaily-track');
    if (!track) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=mexicodaily&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { track.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-mdaily-item">' + a.title + '</a>').join('<span class="ticker-mdaily-sep">·</span>');
      track.innerHTML = items;
      startMdailyTicker();
    } catch(e) {
      track.innerHTML = '<span>Mexico Daily • Tu fuente diaria de noticias</span>';
      startMdailyTicker();
    }
  }

  function startMdailyTicker() {
    const track = document.getElementById('ticker-mdaily-track');
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
    el.innerHTML = '<header class="site-header-mdaily"><div class="mdaily-header-bar"><span class="mdaily-header-tag">MEXICO DAILY</span></div><nav class="header-mdaily-nav"><div class="nav-mdaily-inner"><a href="' + base + '" class="nav-mdaily-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-mdaily-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-mdaily-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-mdaily-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-mdaily"><div class="footer-mdaily-inner"><div class="footer-mdaily-grid"><div class="footer-mdaily-col"><span class="footer-mdaily-title">Secciones</span><ul class="footer-mdaily-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-mdaily-col"><span class="footer-mdaily-title">Más</span><ul class="footer-mdaily-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-mdaily-col"><span class="footer-mdaily-title">Legal</span><ul class="footer-mdaily-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-mdaily-bottom">© ' + new Date().getFullYear() + ' Mexico Daily. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();