(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="prof-loader"><div class="prof-ray"></div><div class="prof-ray"></div><div class="prof-ray"></div><div class="prof-ray"></div><div class="prof-ray"></div><div class="prof-ray"></div></div><p style="font-weight:700;color:#581c87;font-size:0.85em;letter-spacing:3px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('afterend', '<div class="prof-ticker"><a href="' + base + '" class="ticker-prof-logo"><img src="' + base + 'logo-header.png" alt="elprofetamexicano"></a><div class="ticker-prof-marker"><i class="fas fa-eye"></i></div><div class="ticker-prof-track" id="ticker-prof-track"><span class="ticker-loading">Cargando...</span></div><div class="ticker-prof-right"><div class="ticker-prof-date">' + dateStr + '</div><div class="ticker-prof-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const track = document.getElementById('ticker-prof-track');
    if (!track) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=elprofetamexicano&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { track.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-prof-item">' + a.title + '</a>').join('<span class="ticker-prof-sep">✦</span>');
      track.innerHTML = items;
      startProfTicker();
    } catch(e) {
      track.innerHTML = '<span>El Profeta Mexicano • La verdad que necesitas saber</span>';
      startProfTicker();
    }
  }

  function startProfTicker() {
    const track = document.getElementById('ticker-prof-track');
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
    el.innerHTML = '<header class="site-header-prof"><div class="prof-header-eyebrow"><span class="prof-header-tag"><i class="fas fa-eye"></i> EL PROFETA MEXICANO</span></div><nav class="header-prof-nav"><div class="nav-prof-inner"><a href="' + base + '" class="nav-prof-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-prof-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-prof-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-prof-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-prof"><div class="footer-prof-inner"><div class="footer-prof-grid"><div class="footer-prof-col"><span class="footer-prof-title">Secciones</span><ul class="footer-prof-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-prof-col"><span class="footer-prof-title">Análisis</span><ul class="footer-prof-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-prof-col"><span class="footer-prof-title">Legal</span><ul class="footer-prof-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-prof-bottom">© ' + new Date().getFullYear() + ' El Profeta Mexicano. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();