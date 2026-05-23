(function() {
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;"><div class="adn-loader"><div class="adn-strand"><div class="adn-node"></div><div class="adn-node"></div><div class="adn-node"></div><div class="adn-node"></div></div><div class="adn-bridge"></div><div class="adn-strand right"><div class="adn-node"></div><div class="adn-node"></div><div class="adn-node"></div><div class="adn-node"></div></div></div><p style="font-weight:700;color:#be123c;font-size:0.85em;letter-spacing:2px;text-transform:uppercase;">Cargando...</p></div>';
    window.addEventListener('load', () => { setTimeout(() => el.classList.add('hidden'), 500); });
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = '<header class="site-header-adn"><nav class="header-adn-nav"><div class="nav-inner">' +
      '<a href="' + base + '" class="nav-adn-link active">Inicio</a>' +
      '<a href="' + base + 'categoria/index.html?cat=nacional" class="nav-adn-link">Nacional</a>' +
      '<a href="' + base + 'categoria/index.html?cat=politica" class="nav-adn-link">Política</a>' +
      '<a href="' + base + 'categoria/index.html?cat=economia" class="nav-adn-link">Economía</a>' +
      '<a href="' + base + 'categoria/index.html?cat=cultura" class="nav-adn-link">Cultura</a>' +
      '</div></nav></header>';
  }

  function injectTicker() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.insertAdjacentHTML('afterend', '<div class="adn-ticker"><a href="' + base + '" class="ticker-adn-logo"><img src="' + base + 'logo-header.png" alt="adnmexicano"></a><div class="ticker-adn-label"><i class="fas fa-dna"></i>ADN</div><div class="ticker-adn-viewport"><div class="ticker-adn-track" id="ticker-adn-track"><span class="ticker-loading">Cargando noticias...</span></div></div></div>');
    fetchTicker();
  }

  async function fetchTicker() {
    const track = document.getElementById('ticker-adn-track');
    if (!track) return;
    try {
      const res = await fetch('https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=adnmexicano&limit=5');
      if (!res.ok) throw new Error('Network');
      const data = await res.json();
      const articles = data.articles || [];
      if (!articles.length) { track.innerHTML = '<span>Sin noticias disponibles</span>'; return; }
      const items = articles.map(a =>
        '<a href="/articulo/?slug=' + encodeURIComponent(a.slug) + '" class="ticker-adn-msg">' + a.title + '</a>'
      ).join('<span class="ticker-adn-sep">||</span>');
      track.innerHTML = items;
      startAdnTicker();
    } catch(e) {
      track.innerHTML = '<span>La esencia de México • Noticias en tiempo real</span>';
      startAdnTicker();
    }
  }

  function startAdnTicker() {
    const track = document.getElementById('ticker-adn-track');
    if (!track) return;
    let pos = 0;
    const totalWidth = track.scrollWidth / 2;
    setInterval(() => {
      pos -= 0.7;
      if (pos < -totalWidth) pos = 0;
      track.style.transform = 'translateX(' + pos + 'px)';
    }, 20);
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer-adn">' +
      '<div class="footer-adn-inner">' +
      '<div class="footer-adn-grid">' +
      '<div class="footer-adn-col"><span class="footer-adn-col-title">Secciones</span><ul class="footer-adn-list"><li><a href="' + base + 'categoria/index.html?cat=nacional">Nacional</a></li><li><a href="' + base + 'categoria/index.html?cat=politica">Política</a></li><li><a href="' + base + 'categoria/index.html?cat=economia">Economía</a></li></ul></div>' +
      '<div class="footer-adn-col"><span class="footer-adn-col-title">Más</span><ul class="footer-adn-list"><li><a href="' + base + 'categoria/index.html?cat=cultura">Cultura</a></li><li><a href="' + base + 'categoria/index.html?cat=sociedad">Sociedad</a></li><li><a href="' + base + 'categoria/index.html?cat=deportes">Deportes</a></li></ul></div>' +
      '<div class="footer-adn-col"><span class="footer-adn-col-title">Legal</span><ul class="footer-adn-list"><li><a href="' + base + 'acerca-de.html">Acerca de</a></li><li><a href="' + base + 'contacto.html">Contacto</a></li><li><a href="' + base + 'privacidad.html">Privacidad</a></li></ul></div>' +
      '</div>' +
      '<div class="footer-adn-bottom"><span>© ' + new Date().getFullYear() + ' ADN Mexicano. Todos los derechos reservados.</span></div>' +
      '</div></footer>';
  }

  function init() { injectPreloader(); injectHeader(); injectTicker(); injectFooter(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();