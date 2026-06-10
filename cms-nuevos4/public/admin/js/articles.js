// Controlador Articulos Publicos con Paginacion y Filtros
let articlesData = [];
let currentSite = "";
let currentPage = 1;
let currentView = 'table';
const limit = 20;

const CATEGORY_COLORS = {
    'nacional': { bg: '#dc3545', gradient: 'linear-gradient(135deg, #dc3545, #c82333)' },
    'politica': { bg: '#007bff', gradient: 'linear-gradient(135deg, #007bff, #0056b3)' },
    'economia': { bg: '#28a745', gradient: 'linear-gradient(135deg, #28a745, #1e7e34)' },
    'deportes': { bg: '#fd7e14', gradient: 'linear-gradient(135deg, #fd7e14, #e85d04)' },
    'cultura': { bg: '#6f42c1', gradient: 'linear-gradient(135deg, #6f42c1, #5a32a3)' },
    'tecnologia': { bg: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8, #138496)' },
    'sociedad': { bg: '#e83e8c', gradient: 'linear-gradient(135deg, #e83e8c, #d6337c)' },
    'internacional': { bg: '#6610f2', gradient: 'linear-gradient(135deg, #6610f2, #510a9f)' }
};

const SITE_INITIALS = {
    'radiocinconoticias': 'RC',
    'centralmexico': 'CM',
    'tvmexico': 'TV',
    'cbnnoticias': 'CB',
    'mexicoinformado': 'MI',
    'nodoinformativo': 'NI',
    'bitacoraurbana': 'BU',
    'reportecentralmx': 'RC',
    'verticenoticias': 'VN',
    'noticiasobjetivo': 'NO'
};

async function initArticles() {
    currentPage = 1;
    await loadPublicArticles();
}

function setArticlesView(view) {
    currentView = view;
    const tableContainer = document.getElementById('articles-table-container');
    const gridContainer = document.getElementById('articles-grid-container');
    const tableBtn = document.getElementById('view-table-btn');
    const gridBtn = document.getElementById('view-grid-btn');

    if (view === 'table') {
        tableContainer.style.display = 'block';
        gridContainer.style.display = 'none';
        tableBtn.style.background = 'var(--primary-color)';
        tableBtn.style.color = '#fff';
        gridBtn.style.background = 'transparent';
        gridBtn.style.color = 'var(--text-primary)';
    } else {
        tableContainer.style.display = 'none';
        gridContainer.style.display = 'grid';
        gridBtn.style.background = 'var(--primary-color)';
        gridBtn.style.color = '#fff';
        tableBtn.style.background = 'transparent';
        tableBtn.style.color = 'var(--text-primary)';
        renderGridView();
    }
}

function renderGridView() {
    const container = document.getElementById('articles-grid-container');
    if (!container || articlesData.length === 0) {
        if (container) container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">No hay articulos para mostrar.</p>';
        return;
    }

    container.innerHTML = articlesData.map(article => generateLinkPreviewCard(article)).join('');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    }, { rootMargin: '100px' });

    container.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
}

function generateLinkPreviewCard(article) {
    const catColor = CATEGORY_COLORS[article.category] || { bg: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d, #545b62)' };
    const siteInitial = getSiteInitial(article.site);
    const publishedDate = article.publishedAt ? formatGridDate(article.publishedAt) : '';

    const imageUrl = article.imageUrl || '';

    return `
        <div class="link-preview-card" onclick="editArticleUnified('${article.id}')">
            <div class="lp-image-container">
                ${imageUrl 
                    ? `<img class="lp-image" data-src="${imageUrl}" alt="${article.title}" onerror="this.parentElement.innerHTML=getCssPlaceholderHtml('${article.category}', '${article.site}', '${article.title}');">`
                    : getCssPlaceholderHtml(article.category, article.site, article.title)
                }
            </div>
            <div class="lp-content">
                <div class="lp-site-badge">
                    <span class="lp-site-initial" style="background:${catColor.gradient}">${siteInitial}</span>
                    <span class="lp-site-name">${getSiteDisplayName(article.site)}</span>
                </div>
                <h3 class="lp-title">${article.title || 'Sin titulo'}</h3>
                ${article.excerpt ? `<p class="lp-excerpt">${truncateText(article.excerpt, 80)}</p>` : ''}
                <div class="lp-meta">
                    <span class="lp-category" style="background:${catColor.bg}20; color:${catColor.bg}">${article.category || 'General'}</span>
                    <span class="lp-date">${publishedDate}</span>
                </div>
            </div>
        </div>
    `;
}

function getCssPlaceholderHtml(category, site, title) {
    const catColor = CATEGORY_COLORS[category] || { bg: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d, #545b62)' };
    const initial = getSiteInitial(site);
    const titleWord = title ? title.split(' ')[0].substring(0, 2).toUpperCase() : '??';

    return `
        <div class="lp-placeholder" style="background:${catColor.gradient}">
            <span class="lp-placeholder-initial">${initial}</span>
            <span class="lp-placeholder-word">${titleWord}</span>
        </div>
    `;
}

function getSiteInitial(site) {
    if (!site) return '??';
    const known = SITE_INITIALS[site];
    if (known) return known;
    return site.substring(0, 2).toUpperCase();
}

function getSiteDisplayName(site) {
    if (!site) return 'Desconocido';
    const names = {
        'radiocinconoticias': 'Radio Cinco',
        'centralmexico': 'Central Mexico',
        'tvmexico': 'TV Mexico',
        'cbnnoticias': 'CBN Noticias',
        'mexicoinformado': 'Mexico Informado',
        'nodoinformativo': 'Nodo Informativo',
        'bitacoraurbana': 'Bitacora Urbana',
        'reportecentralmx': 'Reporte Central',
        'verticenoticias': 'Vertice Noticias',
        'noticiasobjetivo': 'Noticias Objetivo'
    };
    return names[site] || site;
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function formatGridDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Hace minutos';
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

async function loadPublicArticles() {
    const tbody = document.getElementById('articles-public-table');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px;"><i class="fas fa-spinner fa-spin fa-2x"></i></td></tr>';

    try {
        const offset = (currentPage - 1) * limit;
        let url = `/articles?limit=${limit}&offset=${offset}`;
        if (currentSite) url += `&site=${currentSite}`;

        const data = await apiFetch(url);
        articlesData = data.articles || [];

        if (articlesData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-secondary);">No se encontraron articulos.</td></tr>';
        } else {
            tbody.innerHTML = articlesData.map(a => `
                <tr>
                    <td style="font-weight:600;">${a.title || ''}</td>
                    <td><span class="badge-info" style="font-size:0.7rem; background:rgba(6,182,212,0.1); color:var(--primary-color); padding:2px 6px; border-radius:4px;">${a.category || ''}</span></td>
                    <td class="site-cell"><small>${a.site || ''}</small></td>
                    <td style="white-space:nowrap; font-size:0.85rem;">${a.publishedAt ? new Date(a.publishedAt).toLocaleString('es-MX', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : '-'}</td>
                    <td>
                        <span class="status-badge status-featured" style="font-size:0.7rem;">
                            <i class="fas fa-globe"></i> Web
                        </span>
                    </td>
                </tr>
            `).join('');
        }

        document.getElementById('page-info').textContent = `Pagina ${currentPage}`;
        document.getElementById('prev-page').disabled = currentPage === 1;
        document.getElementById('next-page').disabled = articlesData.length < limit;

    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: #dc3545; padding: 40px;">Error al cargar datos: ${e.message}</td></tr>`;
    }
}

async function changeSiteFilter() {
    currentSite = document.getElementById('filter-site').value;
    currentPage = 1;
    await loadPublicArticles();
}

async function changePage(step) {
    currentPage += step;
    if (currentPage < 1) currentPage = 1;
    await loadPublicArticles();
}

async function editArticleUnified(id) {
    try {
        const data = await apiFetch('/articles/id/' + id);
        const a = data.article;
        if (!a) return;

        openUniversalEditor('live', {
            id: a.id,
            title: a.title,
            slug: a.slug,
            content: a.content,
            excerpt: a.excerpt,
            category: a.category,
            author: a.author,
            imageUrl: a.imageUrl,
            site: a.site,
            featured: a.featured
        });
    } catch (e) { alert(e.message); }
}

function showLoading(msg = "Procesando...") {
    const loader = document.getElementById('global-loader');
    const message = document.getElementById('loader-message');
    if (loader) {
        if (message) message.textContent = msg;
        loader.style.display = 'flex';
    }
}

function hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.style.display = 'none';
}

async function publishToFBManual(id) {
    if (!confirm('Deseas poner este articulo en cola para publicarlo en Facebook?')) return;

    showLoading("Publicando en Facebook...");
    try {
        const res = await apiFetch(`/articles/publish-fb/${id}`);
        if (res.success) {
            showSuccessToast('Informacion', 'Facebook publishing es ahora automatico por sitio (cada 6 articulos web).', 3000);
        } else {
            showErrorToast('Error', res.error || 'No se pudo obtener informacion del articulo.', 5000);
        }
        await loadPublicArticles();
    } catch (e) {
        showErrorToast('Error de Conexion', e.message, 5000);
    } finally {
        hideLoading();
    }
}

function showNewArticle() {
    openUniversalEditor('cms');
}
