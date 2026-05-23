(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="pulse-loader"><div class="pulse-dot"></div><div class="pulse-dot"></div><div class="pulse-dot"></div></div><p style="font-weight:700;color:#be123c;font-size:0.9em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 400); });
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.insertAdjacentHTML('afterend', `
<div class="news-ticker-wrap" id="ticker-wrap">
  <div class="ticker-label"><i class="fas fa-bolt"></i>INSTANTE</div>
  <div class="ticker-viewport">
    <div class="ticker-track" id="ticker-track">
      <span class="ticker-loading">Cargando noticias...</span>
    </div>
  </div>
</div>`);
    fetchTickerArticles();
  }

  async function fetchTickerArticles() {
    const track = document.getElementById('ticker-track');
    if (!track) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=nacionalinstante&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { track.innerHTML = '<span class="ticker-msg">Sin noticias disponibles</span>'; return; }
      const tickerItems = articles.map(a =>
        '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-msg" style="color:inherit;text-decoration:none;">' + a.title + '</a>'
      ).join('<span class="ticker-sep">•</span>');
      track.innerHTML = tickerItems;
      startTicker();
    } catch(e) {
      track.innerHTML = '<span class="ticker-msg">ÚLTIMA HORA • Síguenos para más actualizaciones</span>';
      startTicker();
    }
  }

  function startTicker() {
    const track = document.getElementById('ticker-track');
    if (!track) return;
    let pos = 0;
    const totalWidth = track.scrollWidth / 2;
    setInterval(() => {
      pos -= 0.8;
      if (pos < -totalWidth) pos = 0;
      track.style.transform = 'translateX(' + pos + 'px)';
    }, 20);
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const monthNames = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const dayStr = dayNames[now.getDay()] + ', ' + now.getDate() + ' ' + monthNames[now.getMonth()] + ' ' + now.getFullYear();
    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    el.innerHTML = '<header class="site-header-modern"><div class="header-inner">' +
      '<div class="header-brand"><a href="' + base + '" class="logo-link"><img src="' + base + 'logo-header.png" alt="nacionalinstante" class="logo-img"></a><div class="header-brand-text"><span class="brand-name">NACIÓN AL INSTANTE</span><span class="brand-tagline">Noticias en tiempo real</span></div></div>' +
      '<div class="header-center"><nav class="main-nav"><a href="' + base + '" class="nav-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="nav-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="nav-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="nav-link">Economía</a><a href="' + base + 'categoria/index.html?cat=mundo" class="nav-link">Mundo</a></nav></div>' +
      '<div class="header-right"><div class="header-date"><span class="header-date-time">' + timeStr + '</span><span class="header-date-day">' + dayStr + '</span></div>' +
      '<div class="social-links"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" class="social-link" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" class="social-link" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a><a href="https://api.whatsapp.com/send?text=' + encodeURIComponent(window.location.href) + '" class="social-link" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i></a></div></div>' +
      '<button class="nav-toggle" onclick="document.querySelector(\'.main-nav\').classList.toggle(\'open\')"><i class="fas fa-bars"></i></button>' +
      '</div></header>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-modern"><div class="footer-inner"><div class="footer-grid">' +
      '<div><img src="' + base + 'logo-footer.png" alt="nacionalinstante" class="footer-brand-img"><p class="footer-desc">Tu fuente confiable de noticias nacionales. Información verificada y actualizada las 24 horas.</p>' +
      '<div class="footer-social"><a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(document.title) + '" class="social-link" target="_blank" rel="noopener"><i class="fab fa-twitter"></i></a><a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href) + '" class="social-link" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i></a><a href="https://api.whatsapp.com/send?text=' + encodeURIComponent(window.location.href) + '" class="social-link" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i></a><a href="https://www.linkedin.com/shareArticle?url=' + encodeURIComponent(window.location.href) + '" class="social-link" target="_blank" rel="noopener"><i class="fab fa-linkedin-in"></i></a></div></div>' +
      '<div><span class="footer-col-title">Secciones</span><ul class="footer-links-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li><li><a href="' + base + 'categoria/index.html?cat=mundo">Mundo</a></li></ul></div>' +
      '<div><span class="footer-col-title">Institucional</span><ul class="footer-links-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li><li><a href="' + base + 'terminos.html">Términos</a></li></ul></div>' +
      '</div>' +
      '<div class="footer-bottom"><span class="footer-copy">&copy; ' + new Date().getFullYear() + ' nacionalinstante. Todos los derechos reservados.</span>' +
      '<div class="footer-legal"><a href="' + base + 'privacidad.html">Privacidad</a><a href="' + base + 'terminos.html">Términos</a><a href="' + base + 'contacto.html">Contacto</a></div></div>' +
      '</div></footer>';
  }

  function init() { injectPreloader(); injectTicker(); injectHeader(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();