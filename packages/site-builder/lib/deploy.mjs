/**
 * lib/deploy.mjs
 * Wrapper sobre `wrangler pages deploy` para uso programático.
 *
 * Exporta:
 *   deploySite(options)    → Promise<DeployResult>
 *   checkWrangler()        → Promise<{ available: boolean, version?: string }>
 */

import { spawn }  from 'node:child_process';
import path        from 'node:path';

/**
 * @typedef {Object} DeployOptions
 * @property {string}   outDir               - Directorio generado por createSite()
 * @property {string}   projectName          - Nombre del proyecto en Cloudflare Pages
 * @property {string}   [branch='master']    - Branch de deploy
 * @property {string}   [accountId]          - CLOUDFLARE_ACCOUNT_ID (opcional si ya en env)
 * @property {string}   [apiToken]           - CLOUDFLARE_API_TOKEN (opcional si ya en env)
 * @property {import('node:events').EventEmitter} [emitter]
 */

/**
 * @typedef {Object} DeployResult
 * @property {boolean}  success
 * @property {string}   [url]
 * @property {string[]} logs
 * @property {string[]} errors
 */

/**
 * Verifica si wrangler está instalado y disponible.
 * @returns {Promise<{ available: boolean, version?: string }>}
 */
export async function checkWrangler() {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['wrangler', '--version'], { shell: true });
    let output = '';
    proc.stdout.on('data', d => { output += d.toString(); });
    proc.stderr.on('data', d => { output += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        const match = output.match(/(\d+\.\d+\.\d+)/);
        resolve({ available: true, version: match?.[1] });
      } else {
        resolve({ available: false });
      }
    });
    proc.on('error', () => resolve({ available: false }));
  });
}

/**
 * Ejecuta `wrangler pages deploy` en el directorio del sitio generado.
 *
 * Emite en `emitter`:
 *   'progress'  { step: 'deploy', percent: number, message: string }
 *
 * @param {DeployOptions} options
 * @returns {Promise<DeployResult>}
 */
export async function deploySite({
  outDir,
  projectName,
  branch = 'master',
  accountId,
  apiToken,
  emitter,
}) {
  const logs   = [];
  const errors = [];

  function emit(percent, message) {
    emitter?.emit('progress', { step: 'deploy', percent, message });
  }

  function log(line) {
    logs.push(line);
    emitter?.emit('log', line);
  }

  return new Promise((resolve) => {
    emit(5, 'Iniciando wrangler pages deploy...');

    const args = [
      'wrangler', 'pages', 'deploy', '.',
      `--project-name=${projectName}`,
      `--branch=${branch}`,
    ];

    const env = { ...process.env };
    if (accountId) env.CLOUDFLARE_ACCOUNT_ID = accountId;
    if (apiToken)  env.CLOUDFLARE_API_TOKEN   = apiToken;

    const proc = spawn('npx', args, {
      cwd:   path.resolve(outDir),
      env,
      shell: true,
    });

    let lastPercent = 5;

    function parseLine(raw) {
      const line = raw.trim();
      if (!line) return;
      log(line);

      // Estimación de progreso por keywords en la salida de wrangler
      if (line.includes('Uploading'))        { emit(30,  line); lastPercent = 30; }
      else if (line.includes('Processing'))  { emit(55,  line); lastPercent = 55; }
      else if (line.includes('Deployment'))  { emit(75,  line); lastPercent = 75; }
      else if (line.includes('Success'))     { emit(90,  line); lastPercent = 90; }
      else if (lastPercent < 25)             { emit(lastPercent + 2, line); lastPercent += 2; }
    }

    let stdoutBuf = '';
    let stderrBuf = '';

    proc.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString();
      const lines = stdoutBuf.split('\n');
      stdoutBuf = lines.pop() ?? '';
      lines.forEach(parseLine);
    });

    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      const lines = stderrBuf.split('\n');
      stderrBuf = lines.pop() ?? '';
      lines.forEach(parseLine);
    });

    proc.on('close', (code) => {
      if (stdoutBuf.trim()) parseLine(stdoutBuf);
      if (stderrBuf.trim()) parseLine(stderrBuf);

      if (code === 0) {
        // Extraer URL del output de wrangler
        const urlMatch = logs.join('\n').match(/https?:\/\/[a-z0-9-]+\.pages\.dev[^\s]*/i);
        const url = urlMatch?.[0] ?? `https://${projectName}.pages.dev`;
        emit(100, `Deploy completado: ${url}`);
        resolve({ success: true, url, logs, errors });
      } else {
        const msg = `wrangler salió con código ${code}`;
        errors.push(msg);
        emit(0, msg);
        resolve({ success: false, logs, errors });
      }
    });

    proc.on('error', (e) => {
      const msg = `No se pudo ejecutar wrangler: ${e.message}`;
      errors.push(msg);
      emit(0, msg);
      resolve({ success: false, logs, errors });
    });
  });
}
