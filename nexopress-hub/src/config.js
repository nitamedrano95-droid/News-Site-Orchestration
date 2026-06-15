// src/config.js — NexoPress Hub configuration
// Single source of truth for the 5 CMS endpoints the Hub orchestrates.

export const DEBUG = false;
export const log = DEBUG ? console.log.bind(console) : () => {};

// CMS endpoint registry — must match the Worker URLs in wrangler.toml [vars]
// Subdominios chispakimnueve.workers.dev (cuenta actual de deploy).
// Esos workers tienen código actualizado y DB con migraciones aplicadas.
// Los subdomains viejos sebastianvernis.workers.dev tienen código y schema
// drift que requieren re-deploy con esta misma cuenta para arreglarse.
export const CMS_ENDPOINTS = {
  originaux: 'https://cms-originaux.chispakimnueve.workers.dev',
  nuevos:    'https://cms-nuevos.chispakimnueve.workers.dev',
  nuevos2:   'https://cms-nuevos2.chispakimnueve.workers.dev',
  nuevos3:   'https://cms-nuevos3.chispakimnueve.workers.dev',
  nuevos4:   'https://cms-nuevos4.chispakimnueve.workers.dev',
};

export const CMS_LIST = Object.keys(CMS_ENDPOINTS);

// Parse ALLOWED_ORIGINS from env (comma-separated string in wrangler.toml [vars])
export const getAllowedOrigins = (env) => {
  const raw = env.ALLOWED_ORIGINS || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
};

// Session lifetime (24h, matches the existing CMS pattern)
export const SESSION_TTL_SECONDS = 86400;

// Hub token validation cache TTL (60s — reduces Hub roundtrips for CMS-bound requests)
export const HUB_TOKEN_CACHE_TTL = 60;
