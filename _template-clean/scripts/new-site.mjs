#!/usr/bin/env node
// scripts/new-site.mjs
// Genera un nuevo sitio a partir de _template-clean/template + un site.config.json.
//
// Uso:
//   node scripts/new-site.mjs --config ./mi-sitio.json --out ../../sites/mi-sitio
//   node scripts/new-site.mjs --config ./mi-sitio.json --out ../../sites/mi-sitio --dry-run
//
// Comportamiento:
//   1. Valida el config contra site.config.schema.json (chequeo básico, sin deps externas).
//   2. Copia template/ a <out>/ (preserva estructura, excluye .git, .DS_Store).
//   3. Sustituye los 7 placeholders literales + host del CMS + nombre de proyecto wrangler.
//   4. Reconstruye wrangler.toml con name + database_name derivado del CMS.
//   5. Reconstruye index.html para que apunte al host del CMS del config.
//   6. Reporta lo que hizo. --dry-run no toca el filesystem.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, "..");
const TEMPLATE   = path.join(ROOT, "template");
const SCHEMA     = path.join(ROOT, "site.config.schema.json");

// ────────────────────────────── args ──────────────────────────────
function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--config") args.config = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else throw new Error(`Argumento desconocido: ${a}`);
  }
  if (!args.config) throw new Error("Falta --config <path>");
  if (!args.out)    throw new Error("Falta --out <path>");
  return args;
}

// ─────────────────────────── validation ───────────────────────────
function fail(msg) { console.error(`✗ ${msg}`); process.exit(1); }

function validateConfig(cfg) {
  if (typeof cfg !== "object" || cfg === null) fail("Config raíz no es objeto.");
  const req = ["name", "title", "prefix", "theme", "cms", "deploy"];
  for (const k of req) if (!(k in cfg)) fail(`Falta campo requerido: ${k}`);

  if (!/^[a-z0-9-]{3,40}$/.test(cfg.name))
    fail(`name inválido: "${cfg.name}" (espera ^[a-z0-9-]{3,40}$)`);
  if (!/^[a-z]{3,6}$/.test(cfg.prefix))
    fail(`prefix inválido: "${cfg.prefix}" (espera ^[a-z]{3,6}$, min 3 chars)`);
  if (typeof cfg.title !== "string" || !cfg.title.trim())
    fail("title vacío.");

  for (const k of ["primary", "secondary", "light", "text"]) {
    if (!/^#[0-9a-fA-F]{6}$/.test(cfg.theme[k] || ""))
      fail(`theme.${k} inválido: "${cfg.theme[k]}" (espera #RRGGBB)`);
  }
  if (!cfg.cms.host || typeof cfg.cms.host !== "string")
    fail("cms.host vacío.");

  if (!cfg.deploy.projectName || !/^[a-z0-9-]{3,40}$/.test(cfg.deploy.projectName))
    fail(`deploy.projectName inválido: "${cfg.deploy.projectName}"`);

  if (Array.isArray(cfg.categories)) {
    cfg.categories.forEach((c, i) => {
      if (!c.id || !/^[a-z0-9-]{2,20}$/.test(c.id))
        fail(`categories[${i}].id inválido: "${c.id}"`);
      if (!c.label) fail(`categories[${i}].label vacío`);
    });
  }
}

// ─────────────────────────── filesystem ───────────────────────────
async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === ".git" || e.name === ".DS_Store") continue;
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

async function* walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkFiles(p);
    else yield p;
  }
}

const TEXT_EXTS = new Set([
  ".html", ".css", ".js", ".json", ".toml", ".txt", ".md", ".xml"
]);

function isTextFile(p) {
  return TEXT_EXTS.has(path.extname(p).toLowerCase());
}

// ─────────────────────────── substitution ─────────────────────────
// Mapa canónico de placeholders → valores del config.
// Los placeholders literales son contratos con components.js, style.css, etc.
//   PLACEHOLDER_NAME      → config.name           (slug, minúsculas)
//   PLACEHOLDER_TITLE     → config.title          (legible)
//   PLACEHOLDER_COLOR     → config.theme.primary
//   PLACEHOLDER_SECONDARY → config.theme.secondary
//   PLACEHOLDER_LIGHT     → config.theme.light
//   PLACEHOLDER_TEXT      → config.theme.text
//   PLACEHOLDER_X         → config.prefix         (3-6 chars, sin guion)
const SUBSTITUTIONS = (cfg) => ({
  PLACEHOLDER_NAME:      cfg.name,
  PLACEHOLDER_TITLE:     cfg.title,
  PLACEHOLDER_COLOR:     cfg.theme.primary,
  PLACEHOLDER_SECONDARY: cfg.theme.secondary,
  PLACEHOLDER_LIGHT:     cfg.theme.light,
  PLACEHOLDER_TEXT:      cfg.theme.text,
  PLACEHOLDER_X:         cfg.prefix,
  // Host del CMS — viene del config, no es un literal fijo.
  "cms-nuevos3.sebastianvernis.workers.dev": cfg.cms.host,
});

function buildReplacements(cfg) {
  // Orden: las claves más largas primero para evitar pisar nombres.
  return Object.entries(SUBSTITUTIONS(cfg))
    .sort((a, b) => b[0].length - a[0].length);
}

function applySubs(text, pairs) {
  let out = text;
  for (const [from, to] of pairs) {
    out = out.split(from).join(to);
  }
  return out;
}

async function transformFile(p, pairs, dryRun) {
  if (!isTextFile(p)) return { changed: false, reason: "no-text" };
  const orig = await fs.readFile(p, "utf8");
  const next = applySubs(orig, pairs);
  if (next === orig) return { changed: false, reason: "no-match" };
  if (!dryRun) await fs.writeFile(p, next, "utf8");
  return { changed: true, delta: next.length - orig.length };
}

// ─────────────────────────── rebuilds ─────────────────────────────
// wrangler.toml: regenerar name + database_name derivado del host del CMS.
// database_name NO se considera un placeholder del sitio — el binding D1
// vive en el CMS; aquí solo escribimos el nombre legible que el CMS espera.
function rebuildWranglerToml(cfg) {
  // Extraer prefijo del host (cms-<x>.<rest>) → "news_db_cms_<x>".
  const m = cfg.cms.host.match(/^cms-([a-z0-9]+)\./);
  const dbName = m ? `news_db_cms_${m[1]}` : `news_db_${cfg.cms.host.replace(/\W+/g, "_")}`;
  return [
    `name = "${cfg.name}"`,
    `pages_build_output_dir = "."`,
    `compatibility_date = "2024-01-01"`,
    ``,
    `[[d1_databases]]`,
    `binding = "DB"`,
    `database_name = "${dbName}"`,
    `database_id = "REPLACE_WITH_CMS_D1_ID"`,
    ``
  ].join("\n");
}

// _redirects: regenerar proxy al host del CMS.
function rebuildRedirects(cfg) {
  return [
    `# Proxy /api/* al worker de noticias`,
    `/api/* https://${cfg.cms.host}/api/:splat 200`,
    ``,
    `# RSS Feed`,
    `/rss.xml  /api/rss/${cfg.name}  200`,
    `/feed.xml /api/rss/${cfg.name}  200`,
    ``
  ].join("\n");
}

// ────────────────────────────── main ──────────────────────────────
async function main() {
  const args = parseArgs(process.argv);
  const cfgPath = path.resolve(args.config);
  const outDir  = path.resolve(args.out);

  if (!(await exists(cfgPath))) fail(`No existe config: ${cfgPath}`);
  if (await exists(outDir))
    fail(`Output ya existe: ${outDir} (bórralo o usa otra ruta)`);
  if (!(await exists(TEMPLATE)))
    fail(`No existe template/: ${TEMPLATE}`);

  const cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));
  validateConfig(cfg);

  console.log(`→ Config:      ${cfgPath}`);
  console.log(`→ Template:    ${TEMPLATE}`);
  console.log(`→ Output:      ${outDir}`);
  console.log(`→ Dry run:     ${args.dryRun ? "sí" : "no"}`);
  console.log(`→ Sitio:       ${cfg.name}  (${cfg.title})`);
  console.log(`→ Prefijo:     ${cfg.prefix}`);
  console.log(`→ CMS host:    ${cfg.cms.host}`);
  console.log("");

  if (args.dryRun) {
    console.log("── Dry run: no se escribirá nada en disco ──");
  }

  if (!args.dryRun) await copyDir(TEMPLATE, outDir);

  const pairs = buildReplacements(cfg);
  const target = args.dryRun ? TEMPLATE : outDir;

  let changed = 0, scanned = 0, noMatch = 0;
  for await (const file of walkFiles(target)) {
    scanned++;
    const r = await transformFile(file, pairs, args.dryRun);
    if (r.changed) changed++;
    else if (r.reason === "no-match") noMatch++;
  }
  console.log(`✓ Escaneados ${scanned} archivos, modificados ${changed} (sin match: ${noMatch}).`);

  // Reconstrucciones dedicadas (wrangler + _redirects).
  if (!args.dryRun) {
    await fs.writeFile(path.join(outDir, "wrangler.toml"), rebuildWranglerToml(cfg), "utf8");
    await fs.writeFile(path.join(outDir, "_redirects"),     rebuildRedirects(cfg),    "utf8");
  }
  console.log(`✓ Regenerados: wrangler.toml, _redirects.`);

  // Copia opcional del logo al _shared del CMS.
  if (cfg.cms.sharedLogoPath) {
    console.log("");
    console.log("→ Siguiente paso manual:");
    console.log(`    cp ${path.join(outDir, "logo-header.png")} ${cfg.cms.sharedLogoPath}${cfg.name}.png`);
  }

  console.log("");
  console.log(`✓ Listo${args.dryRun ? " (dry run)" : ""}. Sitio generado en: ${outDir}`);
  if (!args.dryRun) {
    console.log("");
    console.log("Para desplegar:");
    console.log(`    cd ${outDir}`);
    console.log(`    npx wrangler pages deploy . --project-name=${cfg.deploy.projectName} --branch=${cfg.deploy.branch || "master"}`);
  }
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
