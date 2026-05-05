(function() {
    const SITE_SLUG = 'actualidadsinfronteras';
    const API_URL = `https://cms-nuevos3.sebastianvernis.workers.dev/api/articles?site=${SITE_SLUG}&limit=20`;

    function esc(t) {
        if (!t) return '';
        return String(t)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function enc(t) {
        return encodeURIComponent(t || '');
    }

    async function loadArticles() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Error en API');
            const data = await response.json();
            const articles = data.articles;
            if (!articles || articles.length === 0) {
                console.log('No hay artículos para cargar');
                return;
            }
            populateHero(articles[0]);
            populateCards(articles.slice(1, 7));
        } catch (e) {
            console.error('Error cargando artículos:', e);
        }
    }

    function populateHero(article) {
        if (!article) return;
        const heroContainer = document.getElementById('latest-container');
        if (!heroContainer) return;
        
        const card = document.createElement('a');
        card.href = '/articulo/?slug=' + enc(article.slug);
        card.className = 'hero-card';
        card.innerHTML = `
            <img src="${article.imageUrl || 'https://placehold.co/800x450/0e7490/ffffff?text=News'}" alt="${esc(article.title)}">
            <div class="hero-content">
                <h2>${esc(article.title)}</h2>
                <p>${article.excerpt ? esc(article.excerpt.substring(0, 120)) + '...' : ''}</p>
            </div>
        `;
        heroContainer.innerHTML = '';
        heroContainer.appendChild(card);
    }

    function populateCards(articles) {
        const container = document.getElementById('news-container');
        if (!container || !articles.length) return;
        
        container.innerHTML = '';
        articles.forEach(a => {
            const card = document.createElement('a');
            card.href = '/articulo/?slug=' + enc(a.slug);
            card.className = 'news-card';
            card.innerHTML = `
                <img src="${a.imageUrl || 'https://placehold.co/300x200/0e7490/ffffff?text=News'}" alt="${esc(a.title)}">
                <div class="news-content">
                    <div class="news-category">${esc(a.category || 'Noticias')}</div>
                    <h3 class="news-title">${esc(a.title)}</h3>
                    <p class="news-desc">${a.excerpt ? esc(a.excerpt.substring(0, 100)) + '...' : ''}</p>
                </div>
            `;
            container.appendChild(card);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadArticles);
    } else {
        loadArticles();
    }
})();
