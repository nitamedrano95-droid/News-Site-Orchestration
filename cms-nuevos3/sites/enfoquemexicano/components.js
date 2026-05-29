(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="enfq-loader"><div class="enfq-ring"></div><div class="enfq-ring"></div><div class="enfq-ring"></div></div><p style="font-weight:700;color:#1e40af;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('afterend', '<div class="enfq-ticker"><div class="ticker-enfq-track" id="ticker-enfq-track"><span class="ticker-loading">Cargando...</span></div><div class="ticker-enfq-right"></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const track = document.getElementById('ticker-enfq-track');
    if (!track) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=enfoquemexicano&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { track.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-enfq-item">' + a.title + '</a>').join('<span class="ticker-enfq-sep">·</span>');
      track.innerHTML = items;
      startEnfqTicker();
    } catch(e) {
      track.innerHTML = '<span>Enfoque Mexicano • Noticias con profundidad</span>';
      startEnfqTicker();
    }
  }

  function startEnfqTicker() {
    const track = document.getElementById('ticker-enfq-track');
    if (!track) return;
    let pos = 0;
    const totalWidth = track.scrollWidth / 2;
    setInterval(() => {
      pos -= 0.55;
      if (pos < -totalWidth) pos = 0;
      track.style.transform = 'translateX(' + pos + 'px)';
    }, 20);
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.innerHTML = '<header class="site-header-enfq"><div class="enfq-header-bar" style="display:flex;justify-content:space-between;align-items:center;"><nav class="header-enfq-nav"><div class="nav-enfq-inner"><a href="' + base + '" class="nav-enfq-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-enfq-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-enfq-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-enfq-link">Economía</a></div></nav><div style="display:flex;align-items:center;gap:12px;"><div class="ticker-enfq-date">' + dateStr + '</div><div class="ticker-enfq-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-enfq"><div class="footer-enfq-inner"><div class="footer-enfq-grid"><div class="footer-enfq-col"><span class="footer-enfq-title">Secciones</span><ul class="footer-enfq-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-enfq-col"><span class="footer-enfq-title">Análisis</span><ul class="footer-enfq-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-enfq-col"><span class="footer-enfq-title">Legal</span><ul class="footer-enfq-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-enfq-bottom">© ' + new Date().getFullYear() + ' Enfoque Mexicano. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();