/**
 * Pruebas E2E — Editor del Hub (Playwright)
 *
 * Precondición: variables de entorno
 *   HUB_TEST_EMAIL     — correo de un usuario editor/admin en el Hub
 *   HUB_TEST_PASSWORD  — contraseña de ese usuario
 *
 * Ejecutar:
 *   HUB_TEST_EMAIL=... HUB_TEST_PASSWORD=... npx playwright test \
 *     tests/e2e/editor.spec.js --config tests/playwright.config.js
 */
import { test, expect } from '@playwright/test';
import { HUB, WORKERS, TEST_CREDS } from '../helpers/config.js';

const HUB_UI = HUB.ui;
const CMS_WORKER = WORKERS.originaux;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(`${HUB_UI}/login`);
  await page.waitForLoadState('networkidle');

  // Rellenar credenciales
  await page.fill('input[type="email"], input[name="email"]', TEST_CREDS.email);
  await page.fill('input[type="password"], input[name="password"]', TEST_CREDS.password);
  await page.click('button[type="submit"]');

  // Esperar dashboard o redirección post-login
  await page.waitForURL(/dashboard|editor|\/(?!login)/, { timeout: 15_000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Hub — Login', () => {
  test('página de login carga correctamente', async ({ page }) => {
    await page.goto(`${HUB_UI}/login`);
    await expect(page).toHaveTitle(/.+/, { timeout: 10_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login con credenciales correctas → redirige al dashboard', async ({ page }) => {
    test.skip(!TEST_CREDS.email, 'Requiere HUB_TEST_EMAIL / HUB_TEST_PASSWORD en entorno');
    await login(page);
    // No debe estar en /login después de autenticar
    expect(page.url()).not.toContain('/login');
  });

  test('login con credenciales incorrectas → muestra error', async ({ page }) => {
    await page.goto(`${HUB_UI}/login`);
    await page.fill('input[type="email"], input[name="email"]', 'invalido@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'contraseña_incorrecta');
    await page.click('button[type="submit"]');
    // Debe mostrar mensaje de error (sin redirigir)
    await expect(page.locator('text=/error|inválid|incorrecta|no encontrado/i')).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Editor — campos SEO', () => {
  test.skip(!TEST_CREDS.email, 'Requiere HUB_TEST_EMAIL / HUB_TEST_PASSWORD en entorno');

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('panel SEO es visible en el editor', async ({ page }) => {
    // Navegar al editor (busca un artículo existente o crea uno)
    await page.goto(`${HUB_UI}/editor`);
    await page.waitForLoadState('networkidle');

    // El panel SEO debe existir en alguna forma
    const seoSection = page.locator('[data-testid="seo-panel"], .seo-panel, text=/SEO|palabr/i').first();
    await expect(seoSection).toBeVisible({ timeout: 10_000 });
  });

  test('campos SEO se guardan y persisten (round-trip)', async ({ page }) => {
    // 1. Abrir o crear un artículo
    await page.goto(`${HUB_UI}/editor`);
    await page.waitForLoadState('networkidle');

    const ts = Date.now();
    const testMetaTitle = `Test SEO Title ${ts}`;
    const testMetaDesc  = `Test SEO Description ${ts}`;
    const testKeyword   = `keyword-${ts}`;

    // 2. Rellenar campos SEO
    const metaTitleInput = page.locator('input[placeholder*="Meta título"], input[name="metaTitle"], #meta-title').first();
    const metaDescInput  = page.locator('textarea[placeholder*="Meta descripción"], textarea[name="metaDescription"], #meta-desc').first();
    const keywordInput   = page.locator('input[placeholder*="palabra clave"], input[name="focusKeyword"], #focus-keyword').first();

    await metaTitleInput.fill(testMetaTitle);
    await metaDescInput.fill(testMetaDesc);
    await keywordInput.fill(testKeyword);

    // 3. Guardar
    await page.click('button:has-text("Guardar"), button[aria-label*="guardar"]');
    await page.waitForLoadState('networkidle');

    // 4. Recargar y verificar persistencia
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(metaTitleInput).toHaveValue(testMetaTitle, { timeout: 10_000 });
    await expect(metaDescInput).toHaveValue(testMetaDesc);
    await expect(keywordInput).toHaveValue(testKeyword);
  });
});

test.describe('Editor — búsqueda de links internos', () => {
  test.skip(!TEST_CREDS.email, 'Requiere HUB_TEST_EMAIL / HUB_TEST_PASSWORD en entorno');

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('diálogo de link interno abre y muestra resultados', async ({ page }) => {
    await page.goto(`${HUB_UI}/editor`);
    await page.waitForLoadState('networkidle');

    // Abrir el diálogo de link (botón de enlace en la toolbar del editor)
    const linkBtn = page.locator('[title*="Enlace"], [aria-label*="link"], button:has-text("🔗"), button:has-text("Link")').first();
    await linkBtn.click({ timeout: 10_000 });

    // El diálogo debe aparecer
    const dialog = page.locator('[role="dialog"], .link-dialog').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Escribir en el buscador interno
    const searchInput = dialog.locator('input[placeholder*="Busca"], input[type="text"]').first();
    await searchInput.fill('noticias');

    // Esperar resultados (debounce de 220ms + red)
    await page.waitForTimeout(500);
    const results = dialog.locator('ul li, .link-result-title');
    await expect(results.first()).toBeVisible({ timeout: 10_000 });
  });

  test('seleccionar un resultado inserta el link en el editor', async ({ page }) => {
    await page.goto(`${HUB_UI}/editor`);
    await page.waitForLoadState('networkidle');

    // Hacer clic en el área del editor para posicionar cursor
    const editorArea = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await editorArea.click();
    await page.keyboard.type('Texto de prueba ');

    // Abrir diálogo de link
    const linkBtn = page.locator('[title*="Enlace"], [aria-label*="link"], button:has-text("🔗")').first();
    await linkBtn.click();

    const dialog = page.locator('[role="dialog"], .link-dialog').first();
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Buscar y seleccionar primer resultado
    const searchInput = dialog.locator('input[type="text"]').first();
    await searchInput.fill('mexico');
    await page.waitForTimeout(500);

    const firstResult = dialog.locator('ul li').first();
    await expect(firstResult).toBeVisible({ timeout: 10_000 });
    await firstResult.click();

    // Verificar que el diálogo cerró (link insertado)
    await expect(dialog).toBeHidden({ timeout: 5_000 });
    // El editor debe tener un enlace <a>
    await expect(editorArea.locator('a')).toBeVisible();
  });
});
