(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="xpr-loader"><div class="xpr-dot"></div><div class="xpr-dot"></div><div class="xpr-dot"></div></div><p style="font-weight:700;color:#ea580c;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('afterend', '<div class="xpr-ticker"><div class="ticker-xpr-left"><div class="ticker-xpr-date">' + dateStr + '</div><div class="ticker-xpr-label">EXPRESO</div></div><div class="ticker-xpr-track" id="ticker-xpr-track"><span class="ticker-loading">Cargando...</span></div><div class="ticker-xpr-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div><a href="' + base + '" class="ticker-xpr-logo"><img src="' + base + 'logo-header.png" alt="expresomexicano"></a></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const track = document.getElementById('ticker-xpr-track');
    if (!track) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=expresomexicano&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { track.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-xpr-item">' + a.title + '</a>').join('<span class="ticker-xpr-sep">›</span>');
      track.innerHTML = items;
      startXprTicker();
    } catch(e) {
      track.innerHTML = '<span>Expreso Mexicano • Noticias que impactan</span>';
      startXprTicker();
    }
  }

  function startXprTicker() {
    const track = document.getElementById('ticker-xpr-track');
    if (!track) return;
    let pos = 0;
    const totalWidth = track.scrollWidth / 2;
    setInterval(() => {
      pos -= 0.7;
      if (pos < -totalWidth) pos = 0;
      track.style.transform = 'translateX(' + pos + 'px)';
    }, 20);
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = '<header class="site-header-xpr"><div class="xpr-header-top"><span class="xpr-header-tag">EXPRESO MEXICANO</span></div><nav class="header-xpr-nav"><div class="nav-xpr-inner"><a href="' + base + '" class="nav-xpr-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-xpr-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-xpr-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-xpr-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-xpr"><div class="footer-xpr-inner"><div class="footer-xpr-grid"><div class="footer-xpr-col"><span class="footer-xpr-title">Secciones</span><ul class="footer-xpr-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-xpr-col"><span class="footer-xpr-title">Express</span><ul class="footer-xpr-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-xpr-col"><span class="footer-xpr-title">Legal</span><ul class="footer-xpr-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-xpr-bottom">© ' + new Date().getFullYear() + ' Expreso Mexicano. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();