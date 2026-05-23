(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="wnw-loader"><div class="wnw-globe"></div><div class="wnw-arc"></div><div class="wnw-arc"></div></div><p style="font-weight:700;color:#1e3a5f;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('afterend', '<div class="wnw-ticker"><a href="' + base + '" class="ticker-wnw-logo"><img src="' + base + 'logo-header.png" alt="mexicannewsoftheworld"></a><div class="ticker-wnw-label"><i class="fas fa-globe-americas"></i>MUNDO</div><div class="ticker-wnw-track" id="ticker-wnw-track"><span class="ticker-loading">Cargando...</span></div><div class="ticker-wnw-right"><div class="ticker-wnw-date">' + dateStr + '</div><div class="ticker-wnw-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const track = document.getElementById('ticker-wnw-track');
    if (!track) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=mexicannewsoftheworld&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { track.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-wnw-item">' + a.title + '</a>').join('<span class="ticker-wnw-sep">·</span>');
      track.innerHTML = items;
      startWnwTicker();
    } catch(e) {
      track.innerHTML = '<span>Mexican News of the World • México y el mundo</span>';
      startWnwTicker();
    }
  }

  function startWnwTicker() {
    const track = document.getElementById('ticker-wnw-track');
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
    el.innerHTML = '<header class="site-header-wnw"><div class="wnw-header-bar"><span class="wnw-header-tag"><i class="fas fa-globe-americas"></i>MEXICAN NEWS OF THE WORLD</span></div><nav class="header-wnw-nav"><div class="nav-wnw-inner"><a href="' + base + '" class="nav-wnw-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-wnw-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-wnw-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-wnw-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-wnw"><div class="footer-wnw-inner"><div class="footer-wnw-grid"><div class="footer-wnw-col"><span class="footer-wnw-title">Secciones</span><ul class="footer-wnw-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-wnw-col"><span class="footer-wnw-title">Internacional</span><ul class="footer-wnw-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-wnw-col"><span class="footer-wnw-title">Legal</span><ul class="footer-wnw-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-wnw-bottom">© ' + new Date().getFullYear() + ' Mexican News of the World. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();