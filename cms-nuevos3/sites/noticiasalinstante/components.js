(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="inst-loader"><div class="inst-bar"></div><div class="inst-bar"></div><div class="inst-bar"></div><div class="inst-bar"></div></div><p style="font-weight:700;color:#991b1b;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    el.insertAdjacentHTML('beforebegin', '<div class="inst-ticker"><a href="' + base + '" class="ticker-inst-logo"><img src="' + base + 'logo-header.png" alt="noticiasalinstante"></a><div class="ticker-inst-label"><i class="fas fa-bolt"></i>INSTANTE</div><div class="ticker-inst-viewport" id="ticker-inst-viewport"><div class="ticker-inst-inner" id="ticker-inst-inner"><span class="ticker-loading">Cargando...</span></div></div><div class="ticker-inst-right"><div class="ticker-inst-date">' + dateStr + '</div><div class="ticker-inst-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-inst-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=noticiasalinstante&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-inst-item">' + a.title + '</a>').join('<span class="ticker-inst-sep">·</span>');
      inner.innerHTML = items + items;
      startInstTicker();
    } catch(e) {
      inner.innerHTML = '<span>Noticias al Instante • Lo que pasa ahora</span>';
      startInstTicker();
    }
  }

  function startInstTicker() {
    const inner = document.getElementById('ticker-inst-inner');
    const viewport = document.getElementById('ticker-inst-viewport');
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
    el.innerHTML = '<header class="site-header-inst"><div class="inst-header-bar"><nav class="header-inst-nav"><div class="nav-inst-inner"><a href="' + base + '" class="nav-inst-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-inst-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-inst-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-inst-link">Economía</a></div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-inst"><div class="footer-inst-inner"><div class="footer-inst-grid"><div class="footer-inst-col"><span class="footer-inst-title">Secciones</span><ul class="footer-inst-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-inst-col"><span class="footer-inst-title">Al Instante</span><ul class="footer-inst-list"><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li></ul></div><div class="footer-inst-col"><span class="footer-inst-title">Legal</span><ul class="footer-inst-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-inst-bottom">© ' + new Date().getFullYear() + ' Noticias al Instante. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();