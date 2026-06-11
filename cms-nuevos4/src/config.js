// src/config.js — CMS Nuevos 4: Configuración de los 25 sitios del rediseño
// Generado automáticamente desde data/sites/cms-nuevos4/*.json
// Cambia la plantilla JSON y re-ejecuta scripts/sites/regen-config.js para regenerar.

export const DEBUG = false;
export const log = DEBUG ? console.log.bind(console) : () => {};
export const error = DEBUG ? console.error.bind(console) : () => {};
export const warn = DEBUG ? console.warn.bind(console) : () => {};

export const LOG_PREFIXES = {
  FB: '[FB]', RSS: '[RSS INGEST]', CRON: '[CRON]',
  CACHE: '[CACHE]', AUTH: '[Auth]', DB: '[DB]',
};

// CORS — Dominios permitidos (25 sitios rediseño + pages.dev + admin + workers)
export const ALLOWED_ORIGINS = [
  'https://bitacorainformativa.com',
  'https://www.bitacorainformativa.com',
  'https://codigomexico.com',
  'https://www.codigomexico.com',
  'https://contextomexicano.com',
  'https://www.contextomexicano.com',
  'https://cronicanacionalmx.com',
  'https://www.cronicanacionalmx.com',
  'https://diariodelarepublica.com',
  'https://www.diariodelarepublica.com',
  'https://diarioglobalmexico.com',
  'https://www.diarioglobalmexico.com',
  'https://enlacediariomexico.com',
  'https://www.enlacediariomexico.com',
  'https://espectromexicano.com',
  'https://www.espectromexicano.com',
  'https://expresodemexico.com',
  'https://www.expresodemexico.com',
  'https://focoinformativomx.com',
  'https://www.focoinformativomx.com',
  'https://frenteinformativo.com',
  'https://www.frenteinformativo.com',
  'https://horizonteinformativo.com',
  'https://www.horizonteinformativo.com',
  'https://impactodiariomexico.com',
  'https://www.impactodiariomexico.com',
  'https://nexoinformativo.com',
  'https://www.nexoinformativo.com',
  'https://noticiasdeldiamx.com',
  'https://www.noticiasdeldiamx.com',
  'https://planacentral.com',
  'https://www.planacentral.com',
  'https://prensaciudadana.com',
  'https://www.prensaciudadana.com',
  'https://puntocriticonoticias.com',
  'https://www.puntocriticonoticias.com',
  'https://radarnacional.com',
  'https://www.radarnacional.com',
  'https://referenteinformativo.com',
  'https://www.referenteinformativo.com',
  'https://reportedevanguardia.com',
  'https://www.reportedevanguardia.com',
  'https://rutanacionalnoticias.com',
  'https://www.rutanacionalnoticias.com',
  'https://sintagmanacional.com',
  'https://www.sintagmanacional.com',
  'https://sintesisinformativa.com',
  'https://www.sintesisinformativa.com',
  'https://visionnacionalnoticias.com',
  'https://www.visionnacionalnoticias.com',
  'https://cms-nuevos4.sebastianvernis.workers.dev',
  'https://cms-admin-nuevos4.pages.dev',
  'https://cms-nuevos4.chispakimnueve.workers.dev',
]

// SITIOS_LIST — 25 sitios del rediseño cms-nuevos4
// Generado desde data/sites/cms-nuevos4/*.json
export const SITIOS_LIST = [
  'bitacorainformativa', 'codigomexico', 'contextomexicano', 'cronicanacionalmx', 'diariodelarepublica', 'diarioglobalmexico', 'enlacediariomexico', 'espectromexicano', 'expresodemexico', 'focoinformativomx', 'frenteinformativo', 'horizonteinformativo', 'impactodiariomexico', 'nexoinformativo', 'noticiasdeldiamx', 'planacentral', 'prensaciudadana', 'puntocriticonoticias', 'radarnacional', 'referenteinformativo', 'reportedevanguardia', 'rutanacionalnoticias', 'sintagmanacional', 'sintesisinformativa', 'visionnacionalnoticias',
]

// Admin UI URL para password reset links
export const ADMIN_UI_URL = 'https://cms-admin-nuevos4.pages.dev';

export const SITE_DOMAIN_MAP = {
  bitacorainformativa:     'https://www.bitacorainformativa.com',
  codigomexico:            'https://www.codigomexico.com',
  contextomexicano:        'https://www.contextomexicano.com',
  cronicanacionalmx:       'https://www.cronicanacionalmx.com',
  diariodelarepublica:     'https://www.diariodelarepublica.com',
  diarioglobalmexico:      'https://www.diarioglobalmexico.com',
  enlacediariomexico:      'https://www.enlacediariomexico.com',
  espectromexicano:        'https://www.espectromexicano.com',
  expresodemexico:         'https://www.expresodemexico.com',
  focoinformativomx:       'https://www.focoinformativomx.com',
  frenteinformativo:       'https://www.frenteinformativo.com',
  horizonteinformativo:    'https://www.horizonteinformativo.com',
  impactodiariomexico:     'https://www.impactodiariomexico.com',
  nexoinformativo:         'https://www.nexoinformativo.com',
  noticiasdeldiamx:        'https://www.noticiasdeldiamx.com',
  planacentral:            'https://www.planacentral.com',
  prensaciudadana:         'https://www.prensaciudadana.com',
  puntocriticonoticias:    'https://www.puntocriticonoticias.com',
  radarnacional:           'https://www.radarnacional.com',
  referenteinformativo:    'https://www.referenteinformativo.com',
  reportedevanguardia:     'https://www.reportedevanguardia.com',
  rutanacionalnoticias:    'https://www.rutanacionalnoticias.com',
  sintagmanacional:        'https://www.sintagmanacional.com',
  sintesisinformativa:     'https://www.sintesisinformativa.com',
  visionnacionalnoticias:  'https://www.visionnacionalnoticias.com',
};

export const SITES_CONFIG = {
  bitacorainformativa:     { nombre: 'Bitácora Informativa', tagline: 'El registro de la noticia', dominio: 'https://www.bitacorainformativa.com' },
  codigomexico:            { nombre: 'Código México', tagline: 'Decodificando México', dominio: 'https://www.codigomexico.com' },
  contextomexicano:        { nombre: 'Contexto Mexicano', tagline: 'El contexto que necesitas', dominio: 'https://www.contextomexicano.com' },
  cronicanacionalmx:       { nombre: 'Crónica Nacional MX', tagline: 'La crónica de México', dominio: 'https://www.cronicanacionalmx.com' },
  diariodelarepublica:     { nombre: 'Diario de la República', tagline: 'El diario de la república', dominio: 'https://www.diariodelarepublica.com' },
  diarioglobalmexico:      { nombre: 'Diario Global México', tagline: 'México visto desde el mundo', dominio: 'https://www.diarioglobalmexico.com' },
  enlacediariomexico:      { nombre: 'Enlace Diario México', tagline: 'El enlace diario con la noticia', dominio: 'https://www.enlacediariomexico.com' },
  espectromexicano:        { nombre: 'Espectro Mexicano', tagline: 'El espectro completo de México', dominio: 'https://www.espectromexicano.com' },
  expresodemexico:         { nombre: 'Expreso de México', tagline: 'Velocidad en la noticia', dominio: 'https://www.expresodemexico.com' },
  focoinformativomx:       { nombre: 'Foco Informativo MX', tagline: 'En el foco de la noticia', dominio: 'https://www.focoinformativomx.com' },
  frenteinformativo:       { nombre: 'Frente Informativo', tagline: 'La verdad sin filtros', dominio: 'https://www.frenteinformativo.com' },
  horizonteinformativo:    { nombre: 'Horizonte Informativo', tagline: 'Mirando al horizonte de la noticia', dominio: 'https://www.horizonteinformativo.com' },
  impactodiariomexico:     { nombre: 'Impacto Diario México', tagline: 'El impacto diario de la noticia', dominio: 'https://www.impactodiariomexico.com' },
  nexoinformativo:         { nombre: 'Nexo Informativo', tagline: 'El nexo de la información', dominio: 'https://www.nexoinformativo.com' },
  noticiasdeldiamx:        { nombre: 'Noticias del Día MX', tagline: 'La noticia del día, al día', dominio: 'https://www.noticiasdeldiamx.com' },
  planacentral:            { nombre: 'Plana Central', tagline: 'La plana principal', dominio: 'https://www.planacentral.com' },
  prensaciudadana:         { nombre: 'Prensa Ciudadana', tagline: 'La voz de la ciudadanía', dominio: 'https://www.prensaciudadana.com' },
  puntocriticonoticias:    { nombre: 'Punto Crítico Noticias', tagline: 'El punto crítico de la noticia', dominio: 'https://www.puntocriticonoticias.com' },
  radarnacional:           { nombre: 'Radar Nacional', tagline: 'Detectando la noticia', dominio: 'https://www.radarnacional.com' },
  referenteinformativo:    { nombre: 'Referente Informativo', tagline: 'Tu referente de noticias', dominio: 'https://www.referenteinformativo.com' },
  reportedevanguardia:     { nombre: 'Reporte de Vanguardia', tagline: 'Periodismo de vanguardia', dominio: 'https://www.reportedevanguardia.com' },
  rutanacionalnoticias:    { nombre: 'Ruta Nacional Noticias', tagline: 'La ruta de la noticia', dominio: 'https://www.rutanacionalnoticias.com' },
  sintagmanacional:        { nombre: 'Sintagma Nacional', tagline: 'La sintaxis de la noticia', dominio: 'https://www.sintagmanacional.com' },
  sintesisinformativa:     { nombre: 'Síntesis Informativa', tagline: 'La información sintetizada', dominio: 'https://www.sintesisinformativa.com' },
  visionnacionalnoticias:  { nombre: 'Visión Nacional Noticias', tagline: 'La visión nacional', dominio: 'https://www.visionnacionalnoticias.com' },
};

