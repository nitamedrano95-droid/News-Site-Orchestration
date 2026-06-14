#!/usr/bin/env node
/**
 * cli.mjs  —  CLI de @nexopress/site-builder
 *
 * Comandos:
 *   nexopress-site create  --config <path> --out <dir> [--dry-run] [--skip-deploy]
 *   nexopress-site validate --config <path>
 *   nexopress-site check-wrangler
 *
 * Alternativa (sin instalar):
 *   node packages/site-builder/cli.mjs create --config ./mi-sitio.json --out ./sites/mi-sitio
 */

import { promises as fs } from 'node:fs';
import path               from 'node:path';
import { SiteBuilder, checkWrangler, validateConfig } from './index.mjs';

// ── Colores ANSI ──────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
};

const ok   = (s) => `${c.green}✓${c.reset} ${s}`;
const fail = (s) => `${c.red}✗${c.reset} ${s}`;
const info = (s) => `${c.cyan}→${c.reset} ${s}`;
const dim  = (s) => `${c.dim}${s}${c.reset}`;

// Barra de progreso simple
function progressBar(percent) {
  const width = 30;
  const filled = Math.round((percent / 100) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${c.blue}${bar}${c.reset}] ${String(percent).padStart(3)}%`;
}

// ── Parseo de args ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { command: null, flags: {} };
  const rest = argv.slice(2);

  if (!rest.length || rest[0] === '--help' || rest[0] === '-h') {
    printHelp();
    process.exit(0);
  }

  args.command = rest[0];

  for (let i = 1; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--dry-run')     { args.flags.dryRun = true; }
    else if (a === '--skip-deploy') { args.flags.skipDeploy = true; }
    else if (a === '--config') { args.flags.config = rest[++i]; }
    else if (a === '--out')    { args.flags.out    = rest[++i]; }
    else if (a === '--token')  { args.flags.apiToken = rest[++i]; }
    else if (a === '--account'){ args.flags.accountId = rest[++i]; }
    else { console.error(fail(`Argumento desconocido: ${a}`)); process.exit(1); }
  }
  return args;
}

function printHelp() {
  console.log(`
${c.bold}nexopress-site${c.reset}  —  Constructor de sitios NexoPress

${c.bold}COMANDOS${c.reset}

  ${c.cyan}create${c.reset}  --config <path> --out <dir> [--dry-run] [--skip-deploy]
    Genera el sitio y (por defecto) lo despliega en Cloudflare Pages.

  ${c.cyan}validate${c.reset}  --config <path>
    Valida el JSON de configuración sin generar nada.

  ${c.cyan}check-wrangler${c.reset}
    Verifica si wrangler está instalado y disponible.

${c.bold}OPCIONES${c.reset}

  --config <path>     Ruta al site.config.json
  --out <dir>         Directorio de salida (no debe existir)
  --dry-run           No escribe al disco ni despliega
  --skip-deploy       Genera archivos pero no despliega
  --token <token>     CLOUDFLARE_API_TOKEN (o usa la variable de entorno)
  --account <id>      CLOUDFLARE_ACCOUNT_ID (o usa la variable de entorno)

${c.bold}EJEMPLOS${c.reset}

  # Generar + desplegar
  nexopress-site create --config ./mi-sitio.json --out ./sites/mi-sitio

  # Solo generar (sin deploy)
  nexopress-site create --config ./mi-sitio.json --out ./sites/mi-sitio --skip-deploy

  # Previsualizar sin tocar el disco
  nexopress-site create --config ./mi-sitio.json --out ./sites/mi-sitio --dry-run

  # Validar el config
  nexopress-site validate --config ./mi-sitio.json
`);
}

// ── Comando: validate ─────────────────────────────────────────────────────────
async function cmdValidate({ config: cfgPath }) {
  if (!cfgPath) { console.error(fail('Falta --config')); process.exit(1); }
  const abs = path.resolve(cfgPath);
  let raw;
  try { raw = JSON.parse(await fs.readFile(abs, 'utf8')); }
  catch (e) { console.error(fail(`No se puede leer o parsear: ${abs}\n${e.message}`)); process.exit(1); }

  const { valid, errors } = validateConfig(raw);
  if (valid) {
    console.log(ok(`Config válida: ${c.bold}${raw.name}${c.reset} (${raw.title})`));
    console.log(dim(`  CMS host:   ${raw.cms.host}`));
    console.log(dim(`  Theme:      ${raw.theme.primary} / ${raw.theme.secondary}`));
    console.log(dim(`  Categorías: ${(raw.categories ?? []).length}`));
  } else {
    console.error(fail(`Config inválida — ${errors.length} error(es):`));
    errors.forEach(e => console.error(`  ${c.yellow}${e.field}${c.reset}: ${e.message}`));
    process.exit(1);
  }
}

// ── Comando: check-wrangler ───────────────────────────────────────────────────
async function cmdCheckWrangler() {
  const { available, version } = await checkWrangler();
  if (available) {
    console.log(ok(`wrangler disponible${version ? ` (v${version})` : ''}`));
  } else {
    console.error(fail('wrangler no encontrado. Instálalo con: npm i -g wrangler'));
    process.exit(1);
  }
}

// ── Comando: create ───────────────────────────────────────────────────────────
async function cmdCreate(flags) {
  const { config: cfgPath, out: outDir, dryRun, skipDeploy, apiToken, accountId } = flags;

  if (!cfgPath) { console.error(fail('Falta --config')); process.exit(1); }
  if (!outDir)  { console.error(fail('Falta --out'));    process.exit(1); }

  const abs = path.resolve(cfgPath);
  let config;
  try { config = JSON.parse(await fs.readFile(abs, 'utf8')); }
  catch (e) { console.error(fail(`No se puede leer: ${abs}\n${e.message}`)); process.exit(1); }

  console.log('');
  console.log(`${c.bold}NexoPress Site Builder${c.reset}`);
  console.log(info(`Sitio:    ${c.bold}${config.name}${c.reset}  (${config.title})`));
  console.log(info(`Template: ${c.dim}<paquete>/_template-clean/template${c.reset}`));
  console.log(info(`Salida:   ${path.resolve(outDir)}`));
  console.log(info(`Dry run:  ${dryRun ? c.yellow + 'sí' : c.dim + 'no'}${c.reset}`));
  console.log('');

  const builder = new SiteBuilder();

  // Mostrar progreso en tiempo real
  let lastStep = '';
  builder.on('progress', ({ step, percent, message }) => {
    if (step !== lastStep) {
      if (lastStep) process.stdout.write('\n');
      lastStep = step;
    }
    process.stdout.write(`\r  ${progressBar(percent)}  ${dim(message.slice(0, 60))}`);
  });

  builder.on('log', (line) => {
    // Wrangler deploy logs — mostrar en dim
    if (line.trim()) console.log(`  ${dim(line)}`);
  });

  const result = await builder.run({
    config,
    outDir: path.resolve(outDir),
    dryRun: dryRun ?? false,
    skipDeploy: skipDeploy ?? false,
    apiToken:   apiToken  ?? process.env.CLOUDFLARE_API_TOKEN,
    accountId:  accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID,
  });

  process.stdout.write('\n\n');

  if (result.success) {
    console.log(ok(`¡Listo! ${result.phase === 'done' ? '' : `(fase: ${result.phase})`}`));
    if (result.createResult) {
      console.log(dim(`  Archivos: ${result.createResult.filesScanned} escaneados, ${result.createResult.filesChanged} modificados`));
    }
    if (result.deployResult?.url) {
      console.log(`  ${c.green}URL:${c.reset} ${c.bold}${result.deployResult.url}${c.reset}`);
    }
    if (dryRun) {
      console.log(`\n${c.yellow}Dry run — no se escribió nada.${c.reset} Repite sin --dry-run para generar.`);
    }
  } else {
    console.error(fail(`Falló en la fase: ${result.phase}`));
    if (result.validationErrors?.length) {
      result.validationErrors.forEach(e => console.error(`  ${c.yellow}${e.field}${c.reset}: ${e.message}`));
    }
    if (result.createResult?.errors?.length) {
      result.createResult.errors.forEach(e => console.error(`  ${e}`));
    }
    if (result.deployResult?.errors?.length) {
      result.deployResult.errors.forEach(e => console.error(`  ${e}`));
    }
    process.exit(1);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
const { command, flags } = parseArgs(process.argv);

switch (command) {
  case 'create':          await cmdCreate(flags);         break;
  case 'validate':        await cmdValidate(flags);       break;
  case 'check-wrangler':  await cmdCheckWrangler();       break;
  default:
    console.error(fail(`Comando desconocido: "${command}". Usa --help para ver opciones.`));
    process.exit(1);
}
