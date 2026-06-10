/**
 * lib/generate.mjs
 * Genera un sitio completo a partir de una carpeta template/ y un site.config.
 *
 * Exporta:
 *   createSite(options)  → Promise<CreateResult>
 *
 * Compatible con cualquier EventEmitter pasado en options.emitter para reportar
 * progreso al wizard.
 */

import { promises as fs }  from 'node:fs';
import path                 from 'node:path';

// ── Tipos internos ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CreateOptions
 * @property {object}        config          - Objeto site.config validado
 * @property {string}        outDir          - Directorio de salida (debe no existir)
 * @property {string}        templateDir     - Carpeta con el template fuente
 * @property {boolean}       [dryRun=false]  - Si true, no escribe al disco
 * @property {import('node:events').EventEmitter} [emitter] - Para emitir 'progress'
 */

/**
 * @typedef {Object} CreateResult
 * @property {boolean}  success
 * @property {number}   filesScanned
 * @property {number}   filesChanged
 * @property {string[]} errors
 */

// ── Constantes ────────────────────────────────────────────────────────────────

const TEXT_EXTS = new Set([
  '.html', '.css', '.js', '.json', '.toml', '.txt', '.md', '.xml',
]);

const SKIP_ENTRIES = new Set(['.git', '.DS_Store', 'node_modules']);

// ── Helpers de filesystem ─────────────────────────────────────────────────────

async function pathExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_ENTRIES.has(e.name)) continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

async function* walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_ENTRIES.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkFiles(p);
    else yield p;
  }
}

function isTextFile(p) {
  return TEXT_EXTS.has(path.extname(p).toLowerCase());
}

// ── Sustitución de placeholders ───────────────────────────────────────────────

/**
 * Construye el mapa de sustituciones a partir del config.
 * Los placeholders literales son el contrato con el template.
 */
function buildSubstitutions(cfg) {
  return [
    // Orden: más largos primero para evitar pisar subcadenas.
    ['PLACEHOLDER_SECONDARY', cfg.theme.secondary],
    ['PLACEHOLDER_TITLE',     cfg.title],
    ['PLACEHOLDER_COLOR',     cfg.theme.primary],
    ['PLACEHOLDER_LIGHT',     cfg.theme.light],
    ['PLACEHOLDER_TEXT',      cfg.theme.text],
    ['PLACEHOLDER_NAME',      cfg.name],
    ['PLACEHOLDER_X',         cfg.prefix],
    // Host del CMS referenciado en el template base
    ['cms-nuevos3.sebastianvernis.workers.dev', cfg.cms.host],
  ];
}

function applySubstitutions(text, pairs) {
  let out = text;
  for (const [from, to] of pairs) {
    out = out.split(from).join(to);
  }
  return out;
}

async function transformFile(filePath, pairs, dryRun) {
  if (!isTextFile(filePath)) return false;
  const original = await fs.readFile(filePath, 'utf8');
  const updated  = applySubstitutions(original, pairs);
  if (updated === original) return false;
  if (!dryRun) await fs.writeFile(filePath, updated, 'utf8');
  return true;
}

// ── Regeneraciones dedicadas ──────────────────────────────────────────────────

function buildWranglerToml(cfg) {
  const m = cfg.cms.host.match(/^cms-([a-z0-9]+)\./);
  const dbName = m
    ? `news_db_cms_${m[1]}`
    : `news_db_${cfg.cms.host.replace(/\W+/g, '_')}`;
  return [
    `name = "${cfg.name}"`,
    `pages_build_output_dir = "."`,
    `compatibility_date = "2024-01-01"`,
    ``,
    `[[d1_databases]]`,
    `binding = "DB"`,
    `database_name = "${dbName}"`,
    `database_id = "REPLACE_WITH_CMS_D1_ID"`,
    ``,
  ].join('\n');
}

function buildRedirects(cfg) {
  return [
    `# Proxy /api/* al worker de noticias`,
    `/api/* https://${cfg.cms.host}/api/:splat 200`,
    ``,
    `# RSS Feed`,
    `/rss.xml  /api/rss/${cfg.name}  200`,
    `/feed.xml /api/rss/${cfg.name}  200`,
    ``,
  ].join('\n');
}

function buildRobotsTxt(cfg) {
  return [
    `User-agent: *`,
    `Allow: /`,
    ``,
    `Sitemap: https://${cfg.name}.pages.dev/sitemap.xml`,
    ``,
  ].join('\n');
}

// ── API principal ─────────────────────────────────────────────────────────────

/**
 * Genera un sitio completo en `outDir` a partir de `templateDir` y `config`.
 *
 * Emite eventos en `emitter`:
 *   'progress'  { step: string, percent: number, message: string }
 *
 * @param {CreateOptions} options
 * @returns {Promise<CreateResult>}
 */
export async function createSite({ config, outDir, templateDir, dryRun = false, emitter }) {
  const errors = [];

  function emit(step, percent, message) {
    emitter?.emit('progress', { step, percent, message });
  }

  try {
    // ── 1. Validar paths ──────────────────────────────────────────────────
    emit('validate', 5, 'Verificando rutas...');

    if (!(await pathExists(templateDir))) {
      throw new Error(`No existe el directorio template: ${templateDir}`);
    }
    if (!dryRun && (await pathExists(outDir))) {
      throw new Error(`El directorio de salida ya existe: ${outDir}. Bórralo primero o usa otra ruta.`);
    }

    // ── 2. Copiar template ────────────────────────────────────────────────
    emit('copy', 15, `Copiando template a ${outDir}...`);
    if (!dryRun) await copyDir(templateDir, outDir);

    // ── 3. Aplicar sustituciones ──────────────────────────────────────────
    emit('transform', 35, 'Aplicando configuración a los archivos...');
    const pairs       = buildSubstitutions(config);
    const target      = dryRun ? templateDir : outDir;
    let filesScanned  = 0;
    let filesChanged  = 0;

    const allFiles = [];
    for await (const f of walkFiles(target)) allFiles.push(f);

    for (let i = 0; i < allFiles.length; i++) {
      const changed = await transformFile(allFiles[i], pairs, dryRun);
      filesScanned++;
      if (changed) filesChanged++;
      // Progreso de 35% a 75%
      const pct = 35 + Math.round((i / allFiles.length) * 40);
      if (i % 5 === 0) emit('transform', pct, `Procesando archivos (${i + 1}/${allFiles.length})...`);
    }

    // ── 4. Reconstruir archivos especiales ────────────────────────────────
    emit('rebuild', 80, 'Generando wrangler.toml y _redirects...');
    if (!dryRun) {
      await fs.writeFile(path.join(outDir, 'wrangler.toml'), buildWranglerToml(config), 'utf8');
      await fs.writeFile(path.join(outDir, '_redirects'),   buildRedirects(config),    'utf8');
      await fs.writeFile(path.join(outDir, 'robots.txt'),   buildRobotsTxt(config),    'utf8');
    }

    emit('done', 100, dryRun
      ? `Dry run completado. ${filesScanned} archivos escaneados, ${filesChanged} serían modificados.`
      : `Sitio generado en ${outDir}. ${filesScanned} archivos procesados, ${filesChanged} modificados.`
    );

    return { success: true, filesScanned, filesChanged, errors };

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(msg);
    emit('error', 0, msg);
    return { success: false, filesScanned: 0, filesChanged: 0, errors };
  }
}
