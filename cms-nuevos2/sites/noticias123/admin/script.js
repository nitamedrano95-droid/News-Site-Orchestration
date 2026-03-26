const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8781/api' : '/api';
const STORAGE_KEY = 'cms_articles_noticiasintegra';
const TOKEN_KEY = 'cms_token_noticiasintegra';
const SESSION_KEY = 'cms_session_noticiasintegra';

let articles = [];
let currentToken = '';
let currentView = 'table';

const CATEGORY_COLORS = {
    'nacional': { bg: '#dc3545', gradient: 'linear-gradient(135deg, #dc3545, #c82333)' },
    'politica': { bg: '#007bff', gradient: 'linear-gradient(135deg, #007bff, #0056b3)' },
    'economia': { bg: '#28a745', gradient: 'linear-gradient(135deg, #28a745, #1e7e34)' },
    'deportes': { bg: '#fd7e14', gradient: 'linear-gradient(135deg, #fd7e14, #e85d04)' },
    'cultura': { bg: '#6f42c1', gradient: 'linear-gradient(135deg, #6f42c1, #5a32a3)' },
    'tecnologia': { bg: '#17a2b8', gradient: 'linear-gradient(135deg, #17a2b8, #138496)' }
};

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadArticles();
    setupEventListeners();
});

async function checkAuth() {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    try {
        const token = sessionStorage.getItem(TOKEN_KEY);
        if (!token || token.length !== 64) throw new Error('Token invalido');
        currentToken = token;
        document.getElementById('auth-check').style.display = 'none';
        document.getElementById('admin-app').style.display = 'flex';
        displayToken();
    } catch (error) {
        window.location.href = 'login.html';
    }
}

function displayToken() {
    const tokenDisplay = document.getElementById('current-token');
    if (tokenDisplay) tokenDisplay.textContent = currentToken.substring(0, 32) + '...';
}

async function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.href = 'login.html';
}

function showView(viewName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) item.classList.add('active');
    });
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById('view-' + viewName).classList.add('active');

    const titles = {
        'dashboard': 'Dashboard',
        'articles': 'Articulos',
        'new-article': 'Crear Articulo',
        'categories': 'Categorias',
        'settings': 'Configuracion'
    };
    document.getElementById('page-title').textContent = titles[viewName] || 'Dashboard';

    if (viewName === 'articles') {
        renderArticlesTable();
    } else if (viewName === 'dashboard') {
        updateDashboard();
    } else if (viewName === 'categories') {
        updateCategories();
    } else if (viewName === 'new-article') {
        resetArticleForm();
    }
}

function setArticlesView(view) {
    currentView = view;
    const gridContainer = document.getElementById('articles-grid');
    const tableContainer = gridContainer.nextElementSibling;
    const tableBtn = document.getElementById('view-table-btn');
    const gridBtn = document.getElementById('view-grid-btn');

    if (view === 'table') {
        gridContainer.style.display = 'none';
        tableContainer.style.display = 'block';
        tableBtn.style.background = 'var(--primary-color)';
        tableBtn.style.color = '#fff';
        gridBtn.style.background = 'transparent';
        gridBtn.style.color = 'var(--text-secondary)';
    } else {
        gridContainer.style.display = 'grid';
        tableContainer.style.display = 'none';
        gridBtn.style.background = 'var(--primary-color)';
        gridBtn.style.color = '#fff';
        tableBtn.style.background = 'transparent';
        tableBtn.style.color = 'var(--text-secondary)';
        renderArticlesGrid();
    }
}

function renderArticlesGrid() {
    const container = document.getElementById('articles-grid');
    if (!container) return;
    
    const searchTerm = document.getElementById('search-articles')?.value.toLowerCase() || '';
    const filtered = articles.filter(a => 
        a.title.toLowerCase().includes(searchTerm) ||
        (a.category && a.category.toLowerCase().includes(searchTerm))
    );

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:40px;">No hay articulos para mostrar.</p>';
        return;
    }

    container.innerHTML = filtered.map(article => generateArticleCard(article)).join('');
}

function generateArticleCard(article) {
    const catColor = CATEGORY_COLORS[article.category] || { bg: '#6c757d', gradient: 'linear-gradient(135deg, #6c757d, #545b62)' };
    const siteInitial = article.title ? article.title.substring(0, 2).toUpperCase() : '??';
    const imageUrl = article.imageUrl || '';

    return `
        <div class="article-card" onclick="editArticle('${article.id}')">
            <div class="card-image">
                ${imageUrl 
                    ? `<img src="${imageUrl}" alt="${article.title}" onerror="this.parentElement.innerHTML='<div class=\\'card-placeholder\\' style=\\'background:${catColor.gradient}\\'><span>${siteInitial}</span></div>'">`
                    : `<div class="card-placeholder" style="background:${catColor.gradient}"><span>${siteInitial}</span></div>`
                }
            </div>
            <div class="card-content">
                <span class="card-category" style="background:${catColor.bg}20;color:${catColor.bg}">${article.category || 'General'}</span>
                <h3 class="card-title">${article.title || 'Sin titulo'}</h3>
                <p class="card-excerpt">${article.excerpt ? article.excerpt.substring(0, 60) + '...' : ''}</p>
                <div class="card-meta">
                    <span class="card-author"><i class="fas fa-user"></i> ${article.author || 'Redaccion'}</span>
                    <span class="card-date">${formatDate(article.createdAt)}</span>
                </div>
            </div>
        </div>
    `;
}

function loadArticles() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        articles = JSON.parse(stored);
    } else {
        articles = [{
            id: '1',
            title: 'Informe especial: El futuro de la tecnologia en Mexico',
            slug: 'informe-especial-tecnologia',
            excerpt: 'Un analisis profundo sobre como la innovacion esta transformando diversos sectores del pais',
            content: 'El panorama tecnologico en Mexico ha experimentado una transformacion sin precedentes...',
            category: 'nacional',
            author: 'Redaccion',
            imageUrl: 'https://placehold.co/800x500/004a99/ffffff?text=Tecnologia',
            status: 'published',
            featured: true,
            tags: ['tecnologia', 'innovacion', 'mexico'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }];
        saveArticles();
    }
    updateDashboard();
}

function saveArticles() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
    updateDashboard();
}

function renderArticlesTable() {
    const tbody = document.getElementById('articles-body');
    if (!tbody) return;

    const searchTerm = document.getElementById('search-articles')?.value.toLowerCase() || '';
    const filtered = articles.filter(a => 
        a.title.toLowerCase().includes(searchTerm) ||
        (a.category && a.category.toLowerCase().includes(searchTerm))
    );

    tbody.innerHTML = filtered.map(article => `
        <tr>
            <td>
                <strong>${article.title}</strong>
                <br><small style="color: #999;">${article.slug}</small>
            </td>
            <td><span class="badge badge-${getCategoryColor(article.category)}">${article.category}</span></td>
            <td>${article.author}</td>
            <td>
                <span class="badge badge-${article.status === 'published' ? 'success' : 'warning'}">
                    ${article.status === 'published' ? 'Publicado' : 'Borrador'}
                </span>
            </td>
            <td>${formatDate(article.createdAt)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="editArticle('${article.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteArticle('${article.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderRecentArticles() {
    const tbody = document.getElementById('recent-articles-body');
    if (!tbody) return;

    const recent = articles.slice(-5).reverse();
    tbody.innerHTML = recent.map(article => `
        <tr>
            <td><strong>${article.title}</strong></td>
            <td><span class="badge badge-${getCategoryColor(article.category)}">${article.category}</span></td>
            <td>
                <span class="badge badge-${article.status === 'published' ? 'success' : 'warning'}">
                    ${article.status === 'published' ? 'Publicado' : 'Borrador'}
                </span>
            </td>
            <td>${formatDate(article.createdAt)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" onclick="editArticle('${article.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteArticle('${article.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function editArticle(id) {
    const article = articles.find(a => a.id === id);
    if (!article) return;

    document.getElementById('article-id').value = article.id;
    document.getElementById('article-title').value = article.title;
    document.getElementById('article-slug').value = article.slug;
    document.getElementById('article-excerpt').value = article.excerpt || '';
    document.getElementById('article-content').value = article.content;
    document.getElementById('article-category').value = article.category;
    document.getElementById('article-author').value = article.author || '';
    document.getElementById('article-image').value = article.imageUrl || '';
    document.getElementById('article-tags').value = article.tags?.join(', ') || '';
    document.getElementById('article-status').value = article.status;
    document.getElementById('article-featured').checked = article.featured || false;

    document.getElementById('article-form-title').textContent = 'Editar Articulo';
    document.getElementById('btn-delete').style.display = 'block';

    showView('new-article');
}

function deleteArticle(id) {
    if (!confirm('Esta seguro de eliminar este articulo?')) return;
    articles = articles.filter(a => a.id !== id);
    saveArticles();
    renderArticlesTable();
    updateDashboard();
    showToast('Articulo eliminado correctamente', 'success');
}

function resetArticleForm() {
    document.getElementById('article-form').reset();
    document.getElementById('article-id').value = '';
    document.getElementById('article-form-title').textContent = 'Crear Nuevo Articulo';
    document.getElementById('btn-delete').style.display = 'none';
    generateSlug();
}

function generateSlug() {
    const title = document.getElementById('article-title').value;
    const slugInput = document.getElementById('article-slug');
    if (!slugInput.value || slugInput.value === 'se-genera-automaticamente') {
        const slug = title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        slugInput.value = slug;
    }
}

function updateDashboard() {
    const total = articles.length;
    const published = articles.filter(a => a.status === 'published').length;
    const drafts = articles.filter(a => a.status === 'draft').length;

    document.getElementById('total-articles').textContent = total;
    document.getElementById('published-articles').textContent = published;
    document.getElementById('draft-articles').textContent = drafts;

    renderRecentArticles();
}

function updateCategories() {
    const categories = {};
    articles.forEach(a => {
        categories[a.category] = (categories[a.category] || 0) + 1;
    });

    ['nacional', 'politica', 'economia', 'deportes'].forEach(cat => {
        const el = document.getElementById('cat-' + cat + '-count');
        if (el) el.textContent = (categories[cat] || 0) + ' articulos';
    });
}

function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            showView(item.dataset.view);
        });
    });

    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('article-form')?.addEventListener('submit', handleArticleSubmit);
    document.getElementById('article-title')?.addEventListener('input', generateSlug);
    document.getElementById('search-articles')?.addEventListener('input', () => {
        if (currentView === 'table') renderArticlesTable();
        else renderArticlesGrid();
    });
}

function handleArticleSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('article-id').value;
    const article = {
        id: id || Date.now().toString(),
        title: document.getElementById('article-title').value,
        slug: document.getElementById('article-slug').value,
        excerpt: document.getElementById('article-excerpt').value,
        content: document.getElementById('article-content').value,
        category: document.getElementById('article-category').value,
        author: document.getElementById('article-author').value,
        imageUrl: document.getElementById('article-image').value,
        tags: document.getElementById('article-tags').value.split(',').map(t => t.trim()).filter(t => t),
        status: document.getElementById('article-status').value,
        featured: document.getElementById('article-featured').checked,
        createdAt: id ? articles.find(a => a.id === id)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (id) {
        const index = articles.findIndex(a => a.id === id);
        articles[index] = article;
        showToast('Articulo actualizado correctamente', 'success');
    } else {
        articles.push(article);
        showToast('Articulo creado correctamente', 'success');
    }

    saveArticles();
    showView('articles');
}

function getCategoryColor(category) {
    const colors = {
        'nacional': 'danger',
        'politica': 'info',
        'economia': 'success',
        'deportes': 'warning',
        'cultura': 'info',
        'tecnologia': 'success'
    };
    return colors[category] || 'info';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function regenerateToken() {
    if (!confirm('Esta seguro de regenerar el token?')) return;
    const newToken = generateToken();
    sessionStorage.setItem(TOKEN_KEY, newToken);
    currentToken = newToken;
    displayToken();
    showToast('Token regenerado correctamente', 'success');
}

function generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function exportArticles() {
    const data = JSON.stringify(articles, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'articles-export.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Articulos exportados correctamente', 'success');
}

window.showView = showView;
window.editArticle = editArticle;
window.deleteArticle = deleteArticle;
window.regenerateToken = regenerateToken;
window.exportArticles = exportArticles;
window.setArticlesView = setArticlesView;
