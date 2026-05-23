(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="aztec-loader"><div class="aztec-step s1"></div><div class="aztec-step s2"></div><div class="aztec-step s3"></div><div class="aztec-step s4"></div></div><p style="font-weight:700;color:#15803d;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = '<header class="site-header-aztec"><nav class="header-aztec-nav"><div class="nav-inner"><a href="' + base + '" class="nav-aztec-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-aztec-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-aztec-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-aztec-link">Economía</a></div></nav></header>';
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const day = now.getDate();
    const month = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()];
    const dateStr = day + ' ' + month;
    const socialShare = '<div class="ticker-aztec-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a><a href="https://api.whatsapp.com/send?text=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i></a></div>';
    el.insertAdjacentHTML('beforebegin', '<div class="aztec-ticker"><div class="ticker-aztec-left"><div class="ticker-aztec-logo"><img src="' + base + 'logo-header.png" alt="aztecamexiconoticias"></div><div class="ticker-aztec-date">' + dateStr + '</div></div><div class="ticker-aztec-financial"><div class="ticker-aztec-viewport" id="ticker-aztec-viewport"><div class="ticker-aztec-inner" id="ticker-aztec-inner"><span class="ticker-loading">Cargando...</span></div></div></div><div class="ticker-aztec-right"><div class="ticker-aztec-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a><a href="https://api.whatsapp.com/send?text=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i></a></div></div></div>');
    fetchAztecTicker();
  }

  async function fetchAztecTicker() {
    const inner = document.getElementById('ticker-aztec-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=aztecamexiconoticias&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span class="ticker-aztec-msg">Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-aztec-msg">' + a.title + '</a>').join('<span class="ticker-aztec-sep">•</span>');
      inner.innerHTML = items + items;
      startAztecTicker();
    } catch(e) {
      inner.innerHTML = '<span class="ticker-aztec-msg">Azteca México Noticias</span>';
      startAztecTicker();
    }
  }

  function startAztecTicker() {
    const inner = document.getElementById('ticker-aztec-inner');
    const viewport = document.getElementById('ticker-aztec-viewport');
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

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-aztec"><div class="footer-aztec-inner"><div class="footer-aztec-grid"><div class="footer-aztec-col"><span class="footer-aztec-col-title">Secciones</span><ul class="footer-aztec-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div><div class="footer-aztec-col"><span class="footer-aztec-col-title">Acerca</span><ul class="footer-aztec-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-aztec-bottom"><span>© ' + new Date().getFullYear() + ' Azteca México Noticias. Todos los derechos reservados.</span></div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();