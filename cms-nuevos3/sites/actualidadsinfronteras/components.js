(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="book-loader"><div class="book-loader-page left"></div><div class="book-loader-page right"></div></div><p style="font-weight:700;color:#0e7490;font-size:0.85em;letter-spacing:1px;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const now = new Date();
    const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const dateStr = dayNames[now.getDay()] + ' ' + now.getDate() + ' de ' + monthNames[now.getMonth()] + ' ' + now.getFullYear();
    el.innerHTML = '<div class="topbar"><div class="topbar-inner">' +
      '<span class="topbar-date">' + dateStr + '</span>' +
      '<nav class="topbar-nav"><a href="' + base + '" class="topbar-nav-link active">Inicio</a><a href="' + base + 'categoria/index.html?cat=nacional" class="topbar-nav-link">Nacional</a><a href="' + base + 'categoria/index.html?cat=politica" class="topbar-nav-link">Política</a><a href="' + base + 'categoria/index.html?cat=economia" class="topbar-nav-link">Economía</a><a href="' + base + 'categoria/index.html?cat=mundo" class="topbar-nav-link">Mundo</a></nav>' +
      '<a href="' + base + '" class="topbar-logo"><img src="' + base + 'logo-header.png" alt="actualidadsinfronteras"></a>' +
      '</div></div>';
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.insertAdjacentHTML('beforeend', `
<div class="world-ticker" id="world-ticker">
  <div class="ticker-world-label"><i class="fas fa-globe-americas"></i>MUNDO</div>
  <div class="ticker-world-viewport">
    <div class="ticker-world-track" id="ticker-world-track">
      <span class="ticker-loading">Cargando noticias...</span>
    </div>
  </div>
</div>`);
    fetchTicker();
  }

  async function fetchTicker() {
    const track = document.getElementById('ticker-world-track');
    if (!track) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=actualidadsinfronteras&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { track.innerHTML = '<span class="ticker-msg">Sin noticias disponibles</span>'; return; }
      const items = articles.map(a =>
        '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-world-msg">' + a.title + '</a>'
      ).join('<span class="ticker-world-sep">///</span>');
      track.innerHTML = items;
      startWorldTicker();
    } catch(e) {
      track.innerHTML = '<span class="ticker-msg">Noticias del mundo • Síguenos para más actualizaciones</span>';
      startWorldTicker();
    }
  }

  function startWorldTicker() {
    const track = document.getElementById('ticker-world-track');
    if (!track) return;
    let pos = 0;
    const totalWidth = track.scrollWidth / 2;
    setInterval(() => {
      pos -= 0.6;
      if (pos < -totalWidth) pos = 0;
      track.style.transform = 'translateX(' + pos + 'px)';
    }, 20);
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-newspaper">' +
      '<div class="footer-newspaper-inner">' +
      '<div class="footer-newspaper-brand"><img src="' + base + 'logo-footer.png" alt="actualidadsinfronteras" class="footer-newspaper-logo"><p class="footer-newspaper-desc">Actualidad Sin Fronteras - Tu ventana al mundo. Noticias internacionales verificadas y actualizadas las 24 horas.</p></div>' +
      '<div class="footer-newspaper-cols">' +
      '<div class="footer-col"><span class="footer-col-title">Secciones</span><ul class="footer-col-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li><li><a href="' + base + 'categoria/index.html?cat=mundo">Mundo</a></li></ul></div>' +
      '<div class="footer-col"><span class="footer-col-title">Regiones</span><ul class="footer-col-list"><li><a href="' + base + 'categoria/index.html?cat=norteamerica">Norteamérica</a></li><li><a href="' + base + 'categoria/index.html?cat=latinoamerica">Latinoamérica</a></li><li><a href="' + base + 'categoria/index.html?cat=europa">Europa</a></li><li><a href="' + base + 'categoria/index.html?cat=asia">Asia</a></li></ul></div>' +
      '<div class="footer-col"><span class="footer-col-title">Legal</span><ul class="footer-col-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li><li><a href="' + base + 'terminos.html">Términos</a></li></ul></div>' +
      '</div>' +
      '<div class="footer-newspaper-bottom"><span>© ' + new Date().getFullYear() + ' Actualidad Sin Fronteras. Todos los derechos reservados.</span></div>' +
      '</div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();