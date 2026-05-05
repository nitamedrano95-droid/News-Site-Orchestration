(function() {
  const siteConfig = { name: 'Enfoque Mexicano', slug: 'enfoquemexicano', accent: '#1e40af' };
  const path = window.location.pathname;
  const isSubdir = /\/(articulo|categoria|admin)\//.test(path);
  const base = isSubdir ? '../' : './';

  function injectPreloader() {
    const el = document.getElementById('site-preloader');
    if (!el) return;
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;"><span class="loader"></span><p style="font-weight:700;color:#0e7490;font-size:0.85em;letter-spacing:1px;">Cargando...</p></div>';
    window.addEventListener('load', () => {
      setTimeout(() => el.classList.add('hidden'), 400);
    });
  }

  function injectHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    el.innerHTML = '<header class="site-header"><h1>Enfoque Mexicano</h1><p>Perspectiva nacional</p></header><nav class="site-nav"><ul><li><a href="' + base + '">Inicio</a></li><li><a href="' + base + 'categoria/nacional">Nacional</a></li><li><a href="' + base + 'categoria/politica">Politica</a></li><li><a href="' + base + 'categoria/economia">Economia</a></li><li><a href="' + base + 'categoria/tecnologia">Tecnologia</a></li></ul></nav>';
  }

  function injectFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = '<footer class="site-footer"><p>&copy; ' + new Date().getFullYear() + ' Enfoque Mexicano. Todos los derechos reservados.</p><p><a href="' + base + 'privacidad.html">Privacidad</a> | <a href="' + base + 'terminos.html">Terminos</a> | <a href="' + base + 'contacto.html">Contacto</a> | <a href="' + base + 'acerca-de.html">Acerca de</a></p></footer>';
  }

  function injectBackToTop() {
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 15l-6-6-6 6"/></svg>';
    btn.style.cssText = 'position:fixed;bottom:24px;right:24px;width:48px;height:48px;border-radius:50%;background:' + siteConfig.accent + ';color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,0.25);z-index:9999;display:none;align-items:center;justify-content:center;transition:all 0.3s;';
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
      btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
    });
  }

  function setActiveNav() {
    const links = document.querySelectorAll('.site-nav a');
    links.forEach(a => {
      if (a.getAttribute('href').includes(path.split('/').pop() || 'index')) {
        a.style.color = 'var(--brand-primary)';
        a.style.borderBottomColor = 'var(--brand-primary)';
      }
    });
  }

  function animateCards() {
    const cards = document.querySelectorAll('.article-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }, i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    cards.forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(card);
    });
  }

  function init() {
    injectPreloader();
    injectHeader();
    injectFooter();
    injectBackToTop();
    setTimeout(setActiveNav, 100);
    setTimeout(animateCards, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
