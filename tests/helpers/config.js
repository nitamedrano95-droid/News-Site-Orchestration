// Configuración central para pruebas E2E — producción

export const WORKERS = {
  originaux: 'https://cms-originaux.sebastianvernis.workers.dev',
  nuevos:    'https://cms-nuevos.sebastianvernis.workers.dev',
  nuevos2:   'https://cms-nuevos2.sebastianvernis.workers.dev',
  nuevos3:   'https://cms-nuevos3.sebastianvernis.workers.dev',
  nuevos4:   'https://cms-nuevos4.sebastianvernis.workers.dev',
};

export const HUB = {
  worker: 'https://nexopress-hub.sebastianvernis.workers.dev',
  ui:     'https://nexopress-hub-ui.pages.dev',
};

// Sitio representativo por CMS para pruebas OG (no-www → Worker, www → Pages)
export const SAMPLE_SITES = {
  originaux: { slug: 'cbnnoticias',      noWww: 'https://cbnnoticias.click',    www: 'https://www.cbnnoticias.click' },
  nuevos:    { slug: 'boominformativo',  noWww: 'https://boominformativo.top',  www: 'https://www.boominformativo.top' },
  nuevos2:   { slug: 'alavistanoticias', noWww: 'https://alavistanoticias.pages.dev', www: null },
  nuevos3:   { slug: 'reportenacional',  noWww: null,                           www: null },
  nuevos4:   { slug: 'contextomexicano', noWww: null,                           www: null },
};

export const TIMEOUT_MS = 15_000;

// Credenciales de prueba — desde env (nunca hardcodear)
export const TEST_CREDS = {
  email:    process.env.HUB_TEST_EMAIL    || '',
  password: process.env.HUB_TEST_PASSWORD || '',
};
