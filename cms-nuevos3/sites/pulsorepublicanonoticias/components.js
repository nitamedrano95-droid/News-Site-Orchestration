(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="pulso-loader"><div class="pulso-dot"></div><div class="pulso-dot"></div><div class="pulso-dot"></div></div><p style="font-weight:700;color:#dc2626;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('afterend', '<div class="pulso-ticker"><a href="' + base + '" class="ticker-pulso-logo"><img src="' + base + 'logo-header.png" alt="pulsorepublicanonoticias"></a><div class="ticker-pulso-label"><i class="fas fa-pulse"></i>PULSO</div><div class="ticker-pulso-track" id="ticker-pulso-track"><span class="ticker-loading">Cargando...</span></div><div class="ticker-pulso-right"><div class="ticker-pulso-date">' + dateStr + '</div><div class="ticker-pulso-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const track = document.getElementById('ticker-pulso-track');
    if (!track) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=pulsorepublicanonoticias&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { track.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-pulso-item">' + a.title + '</a>').join('<span class="ticker-pulso-sep">·</span>');
      track.innerHTML = items;
      startPulsoTicker();
    } catch(e) {
      track.innerHTML = '<span>Pulso Republicano Noticias • El pulso de México</span>';
      startPulsoTicker();
    }
  }

  function startPulsoTicker() {
    const track = document.getElementById('ticker-pulso-track');
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
    el.innerHTML = '<header class="site-header-pulso"><div class="pulso-header-bar"><span class="pulso-header-tag"><i class="fas fa-pulse"></i>PULSO REPUBLICANO</span></div><nav class="header-pulso-nav"><div class="nav-pulso-inner"><a href="' + base + '" class="nav-pulso-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-pulso-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-pulso-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-pulso-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-pulso"><div class="footer-pulso-inner"><div class="footer-pulso-grid"><div class="footer-pulso-col"><span class="footer-pulso-title">Secciones</span><ul class="footer-pulso-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-pulso-col"><span class="footer-pulso-title">Pulso</span><ul class="footer-pulso-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-pulso-col"><span class="footer-pulso-title">Legal</span><ul class="footer-pulso-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-pulso-bottom">© ' + new Date().getFullYear() + ' Pulso Republicano Noticias. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();