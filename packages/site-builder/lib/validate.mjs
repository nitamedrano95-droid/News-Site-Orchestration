/**
 * lib/validate.mjs
 * Validación del site.config.json.
 * No tiene dependencias externas: importable en browser, Node, Cloudflare Worker.
 */

/** @typedef {{ field: string, message: string }} ValidationError */

const COLOR_RE  = /^#[0-9a-fA-F]{6}$/;
const SLUG_RE   = /^[a-z0-9-]{3,40}$/;
const PREFIX_RE = /^[a-z]{3,6}$/;
const CAT_ID_RE = /^[a-z0-9-]{2,20}$/;
const HOST_RE   = /^[a-z0-9.-]+(:\d+)?$/;

/**
 * Valida un objeto de configuración de sitio.
 *
 * @param {unknown} cfg  - El objeto a validar (puede ser cualquier cosa).
 * @returns {{ valid: boolean, errors: ValidationError[] }}
 */
export function validateConfig(cfg) {
  /** @type {ValidationError[]} */
  const errors = [];

  function err(field, message) {
    errors.push({ field, message });
  }

  if (typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) {
    err('root', 'La configuración debe ser un objeto JSON.');
    return { valid: false, errors };
  }

  // ── name ──────────────────────────────────────────────────────────────────
  if (!cfg.name) {
    err('name', 'Requerido.');
  } else if (!SLUG_RE.test(cfg.name)) {
    err('name', `Solo minúsculas, números y guiones, 3-40 chars. Recibido: "${cfg.name}"`);
  }

  // ── title ─────────────────────────────────────────────────────────────────
  if (typeof cfg.title !== 'string' || !cfg.title.trim()) {
    err('title', 'Requerido y no puede estar vacío.');
  }

  // ── prefix ────────────────────────────────────────────────────────────────
  if (!cfg.prefix) {
    err('prefix', 'Requerido.');
  } else if (!PREFIX_RE.test(cfg.prefix)) {
    err('prefix', `Solo minúsculas, 3-6 chars. Recibido: "${cfg.prefix}"`);
  }

  // ── theme ─────────────────────────────────────────────────────────────────
  if (typeof cfg.theme !== 'object' || cfg.theme === null) {
    err('theme', 'Requerido y debe ser un objeto.');
  } else {
    for (const key of ['primary', 'secondary', 'light', 'text']) {
      if (!COLOR_RE.test(cfg.theme[key] ?? '')) {
        err(`theme.${key}`, `Debe ser un color hex válido (#RRGGBB). Recibido: "${cfg.theme[key]}"`);
      }
    }
  }

  // ── cms ───────────────────────────────────────────────────────────────────
  if (typeof cfg.cms !== 'object' || cfg.cms === null) {
    err('cms', 'Requerido y debe ser un objeto.');
  } else {
    if (!cfg.cms.host || typeof cfg.cms.host !== 'string') {
      err('cms.host', 'Requerido.');
    } else if (!HOST_RE.test(cfg.cms.host)) {
      err('cms.host', `Host inválido (sin https://). Recibido: "${cfg.cms.host}"`);
    }
  }

  // ── categories (opcional) ─────────────────────────────────────────────────
  if (cfg.categories !== undefined) {
    if (!Array.isArray(cfg.categories)) {
      err('categories', 'Debe ser un array.');
    } else {
      cfg.categories.forEach((cat, i) => {
        if (!cat.id || !CAT_ID_RE.test(cat.id)) {
          err(`categories[${i}].id`, `ID inválido: "${cat.id}"`);
        }
        if (!cat.label || typeof cat.label !== 'string') {
          err(`categories[${i}].label`, 'Requerido.');
        }
      });
    }
  }

  // ── deploy ────────────────────────────────────────────────────────────────
  if (typeof cfg.deploy !== 'object' || cfg.deploy === null) {
    err('deploy', 'Requerido y debe ser un objeto.');
  } else {
    if (!cfg.deploy.projectName || !SLUG_RE.test(cfg.deploy.projectName)) {
      err('deploy.projectName', `Solo minúsculas, números y guiones, 3-40 chars. Recibido: "${cfg.deploy.projectName}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Igual a validateConfig() pero lanza un Error con los mensajes si hay errores.
 * Útil para código de CLI y tests.
 *
 * @param {unknown} cfg
 * @throws {Error}
 */
export function assertValidConfig(cfg) {
  const { valid, errors } = validateConfig(cfg);
  if (!valid) {
    const msg = errors.map(e => `  ${e.field}: ${e.message}`).join('\n');
    throw new Error(`Configuración inválida:\n${msg}`);
  }
}
