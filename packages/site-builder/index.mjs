/**
 * @nexopress/site-builder
 *
 * Uso como librería (wizard):
 *   import { SiteBuilder } from '@nexopress/site-builder'
 *
 *   const builder = new SiteBuilder()
 *   builder.on('progress', ({ step, percent, message }) => { ... })
 *   const result = await builder.run({ config, outDir })
 *
 * Uso funcional (scripts):
 *   import { validateConfig, createSite, deploySite } from '@nexopress/site-builder'
 */

import { EventEmitter } from 'node:events';
import path             from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateConfig, assertValidConfig } from './lib/validate.mjs';
import { createSite }                         from './lib/generate.mjs';
import { deploySite, checkWrangler }          from './lib/deploy.mjs';

export { validateConfig, assertValidConfig } from './lib/validate.mjs';
export { createSite }                         from './lib/generate.mjs';
export { deploySite, checkWrangler }          from './lib/deploy.mjs';

// Directorio default del template (relativo a este paquete en el monorepo)
const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE = path.resolve(__dirname, '../../_template-clean/template');

// ── Clase principal ───────────────────────────────────────────────────────────

/**
 * SiteBuilder  —  orquestador con EventEmitter.
 *
 * Eventos emitidos:
 *   'progress'  { step: string, percent: number, message: string }
 *   'log'       string   (líneas raw de wrangler durante el deploy)
 *   'done'      RunResult
 *   'error'     Error
 *
 * @extends EventEmitter
 */
export class SiteBuilder extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {string} [options.templateDir] - Sobreescribe el template incluido en el paquete.
   */
  constructor({ templateDir } = {}) {
    super();
    this.templateDir = templateDir ?? DEFAULT_TEMPLATE;
  }

  // ── Validación ──────────────────────────────────────────────────────────────

  /**
   * Valida un objeto de config sin tocar el disco.
   * @param {unknown} config
   * @returns {{ valid: boolean, errors: import('./lib/validate.mjs').ValidationError[] }}
   */
  validate(config) {
    return validateConfig(config);
  }

  // ── Generación ──────────────────────────────────────────────────────────────

  /**
   * Genera los archivos del sitio en `outDir`.
   *
   * @param {object} options
   * @param {object}  options.config
   * @param {string}  options.outDir
   * @param {boolean} [options.dryRun=false]
   * @returns {Promise<import('./lib/generate.mjs').CreateResult>}
   */
  async create({ config, outDir, dryRun = false }) {
    return createSite({
      config,
      outDir,
      templateDir: this.templateDir,
      dryRun,
      emitter: this,
    });
  }

  // ── Deploy ──────────────────────────────────────────────────────────────────

  /**
   * Despliega en Cloudflare Pages.
   *
   * @param {object} options
   * @param {string}  options.outDir
   * @param {string}  options.projectName
   * @param {string}  [options.branch='master']
   * @param {string}  [options.accountId]
   * @param {string}  [options.apiToken]
   * @returns {Promise<import('./lib/deploy.mjs').DeployResult>}
   */
  async deploy({ outDir, projectName, branch, accountId, apiToken }) {
    return deploySite({
      outDir,
      projectName,
      branch,
      accountId,
      apiToken,
      emitter: this,
    });
  }

  // ── Pipeline completo ───────────────────────────────────────────────────────

  /**
   * Ejecuta el pipeline completo: validar → generar → desplegar.
   *
   * Pasa `skipDeploy: true` para solo generar sin desplegar (útil en dev).
   *
   * @param {object}  options
   * @param {object}  options.config
   * @param {string}  options.outDir
   * @param {boolean} [options.dryRun=false]
   * @param {boolean} [options.skipDeploy=false]
   * @param {string}  [options.accountId]
   * @param {string}  [options.apiToken]
   * @returns {Promise<RunResult>}
   */
  async run({ config, outDir, dryRun = false, skipDeploy = false, accountId, apiToken }) {
    // 1. Validar
    this.emit('progress', { step: 'validate', percent: 0, message: 'Validando configuración...' });
    const { valid, errors: validationErrors } = validateConfig(config);
    if (!valid) {
      const err = new Error('Configuración inválida:\n' + validationErrors.map(e => `  ${e.field}: ${e.message}`).join('\n'));
      this.emit('error', err);
      return { success: false, phase: 'validate', validationErrors };
    }
    this.emit('progress', { step: 'validate', percent: 10, message: 'Configuración válida.' });

    // 2. Generar
    const createResult = await this.create({ config, outDir, dryRun });
    if (!createResult.success) {
      const err = new Error(createResult.errors.join('\n'));
      this.emit('error', err);
      return { success: false, phase: 'generate', createResult };
    }

    // 3. Deploy (solo si no es dry-run y no está desactivado)
    if (dryRun || skipDeploy) {
      const result = { success: true, phase: 'done', createResult, deployResult: null };
      this.emit('done', result);
      return result;
    }

    const deployResult = await this.deploy({
      outDir,
      projectName: config.deploy.projectName,
      branch:      config.deploy.branch ?? 'master',
      accountId,
      apiToken,
    });

    const result = {
      success: deployResult.success,
      phase:   deployResult.success ? 'done' : 'deploy',
      createResult,
      deployResult,
    };
    this.emit('done', result);
    return result;
  }
}

/**
 * @typedef {Object} RunResult
 * @property {boolean}  success
 * @property {string}   phase           - Última fase ejecutada: 'validate'|'generate'|'deploy'|'done'
 * @property {object}   [createResult]
 * @property {object}   [deployResult]
 * @property {Array}    [validationErrors]
 */
