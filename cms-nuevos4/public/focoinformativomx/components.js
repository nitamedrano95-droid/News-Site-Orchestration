(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';
  const SITE = 'focoinformativomx';
  const SITE_NAME = 'Foco Informativo MX';
  const PRIMARY = '#ea580c';
  const ITEMS = ["Flash", "Policiaca", "Seguridad", "Justicia", "CDMX", "Estados"];

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="focoinfo-loader"><div class="focoinfo-bar"></div><div class="focoinfo-bar"></div><div class="focoinfo-bar"></div></div><p style="font-weight:700;color:' + PRIMARY + ';font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.insertAdjacentHTML('beforebegin', '<div class="focoinfo-ticker"><div class="ticker-focoinfo-left"><div class="ticker-focoinfo-logo"><img src="' + base + 'logo-header.png" alt="' + SITE + '"></div><div class="ticker-focoinfo-msg">FOCO INFORMATIVO MX</div></div><div class="ticker-focoinfo-viewport" id="ticker-focoinfo-viewport"><div class="ticker-focoinfo-inner" id="ticker-focoinfo-inner"><span class="ticker-focoinfo-loading">Cargando...</span></div></div><div class="ticker-focoinfo-right"><div class="ticker-focoinfo-time">' + timeStr + '</div><div class="ticker-focoinfo-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const inner = document.getElementById('ticker-focoinfo-inner');
    if (!inner) return;
    try {
      const res = await fetch('https://cms-nuevos4.chispakimnueve.workers.dev/api/articles?site=' + SITE + '&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { inner.innerHTML = '<span>Sin noticias</span>'; return; }
      const items = articles.map(a => '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-focoinfo-item">' + a.title + '</a>').join('<span class="ticker-focoinfo-sep">•</span>');
      inner.innerHTML = items + items;
      startFocoinfoTicker();
    } catch(e) {
      inner.innerHTML = '<span>Foco Informativo MX • Tu fuente de noticias</span>';
      startFocoinfoTicker();
    }
  }

  function startFocoinfoTicker() {
    const inner = document.getElementById('ticker-focoinfo-inner');
    const viewport = document.getElementById('ticker-focoinfo-viewport');
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
    const links = ITEMS.map((label, i) => '<a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '" class="nav-focoinfo-link' + (i === 0 ? ' active' : '') + '">' + label + '</a>').join('');
    el.innerHTML = '<header class="site-header-focoinfo"><nav class="header-focoinfo-nav"><div class="nav-focoinfo-inner">' + links + '</div></nav></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const footerLinks = ITEMS.slice(0, 3).map(label => '<li><a href="' + base + 'categoria/index.html?cat=' + label.toLowerCase().replace(/\s+/g, '-') + '">' + label + '</a></li>').join('');
    el.innerHTML = '<footer class="site-footer-focoinfo"><div class="footer-focoinfo-inner"><div class="footer-focoinfo-grid"><div class="footer-focoinfo-col"><span class="footer-focoinfo-title">Secciones</span><ul class="footer-focoinfo-list">' + footerLinks + '</ul></div><div class="footer-focoinfo-col"><span class="footer-focoinfo-title">Legal</span><ul class="footer-focoinfo-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div></div><div class="footer-focoinfo-bottom">© ' + new Date().getFullYear() + ' Foco Informativo MX. Todos los derechos reservados.</div></div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
