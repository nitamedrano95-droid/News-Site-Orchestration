(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="anam-loader"><div class="anam-bar"></div><div class="anam-bar"></div><div class="anam-bar"></div><div class="anam-bar"></div><div class="anam-bar"></div></div><p style="font-weight:700;color:#4338ca;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('afterend', '<div class="anam-ticker"><a href="' + base + '" class="ticker-anam-logo"><img src="' + base + 'logo-header.png" alt="elanalisismexicano"></a><div class="ticker-anam-label"><i class="fas fa-chart-line"></i>ANÁLISIS</div><div class="ticker-anam-date">' + dateStr + '</div><div class="ticker-anam-track" id="ticker-anam-track"><span class="ticker-loading">Cargando...</span></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const track = document.getElementById('ticker-anam-track');
    if (!track) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=elanalisismexicano&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { track.innerHTML = '<span>Sin análisis disponibles</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-anam-item">' + a.title + '</a>').join('<span class="ticker-anam-sep">||</span>');
      track.innerHTML = items;
      startAnamTicker();
    } catch(e) {
      track.innerHTML = '<span>El Análisis Mexicano • Noticias y columnas de análisis</span>';
      startAnamTicker();
    }
  }

  function startAnamTicker() {
    const track = document.getElementById('ticker-anam-track');
    if (!track) return;
    let pos = 0;
    const totalWidth = track.scrollWidth / 2;
    setInterval(() => {
      pos -= 0.6;
      if (pos < -totalWidth) pos = 0;
      track.style.transform = 'translateX(' + pos + 'px)';
    }, 20);
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = '<header class="site-header-anam"><div class="anam-header-bar"><span class="anam-header-tag">OPINIÓN Y ANÁLISIS</span></div><nav class="header-anam-nav"><div class="nav-anam-inner"><a href="' + base + '" class="nav-anam-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-anam-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-anam-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-anam-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-anam"><div class="footer-anam-inner"><div class="footer-anam-grid"><div class="footer-anam-col"><span class="footer-anam-title">Secciones</span><ul class="footer-anam-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-anam-col"><span class="footer-anam-title">Editorial</span><ul class="footer-anam-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-anam-col"><span class="footer-anam-title">Legal</span><ul class="footer-anam-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-anam-bottom">© ' + new Date().getFullYear() + ' El Análisis Mexicano. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();