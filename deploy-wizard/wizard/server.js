'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const yaml = require('js-yaml');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 8080;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory state ─────────────────────────────────────────────────────────
const deployState = {
  status: 'idle',   // idle | running | done | error
  progress: 0,
  lastLine: '',
  logs: [],         // capped at 500 lines
  tokens: new Map() // token → { generatedFiles, createdAt }
};

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// ── Helpers ──────────────────────────────────────────────────────────────────

function pushLog(line) {
  deployState.lastLine = line;
  deployState.logs.push(line);
  if (deployState.logs.length > 500) deployState.logs.shift();
}

/** Issue a short-lived download token and store generated files against it. */
function issueToken(generatedFiles) {
  const token = crypto.randomBytes(16).toString('hex');
  deployState.tokens.set(token, { generatedFiles, createdAt: Date.now() });
  // Cleanup expired tokens
  for (const [t, v] of deployState.tokens) {
    if (Date.now() - v.createdAt > TOKEN_TTL_MS) deployState.tokens.delete(t);
  }
  return token;
}

// ── Generator functions ──────────────────────────────────────────────────────

/**
 * generateDockerCompose(state) → YAML string
 */
function generateDockerCompose(state) {
  const { selectedCMS = [], sources = {}, credentials = {} } = state;
  const n8nEnabled = sources.n8n && sources.n8n.enabled;

  const services = {};

  // wizard (this app)
  services.wizard = {
    build: '.',
    ports: ['8080:8080'],
    restart: 'always',
    environment: {
      NODE_ENV: 'production',
      PORT: '8080',
    },
    depends_on: selectedCMS.reduce((acc, cms) => {
      acc[cms.replace(/-/g, '_')] = { condition: 'service_started' };
      return acc;
    }, {}),
  };

  // nginx
  const nginxDepends = {};
  selectedCMS.forEach(cms => { nginxDepends[cms.replace(/-/g, '_')] = { condition: 'service_started' }; });
  nginxDepends.wizard = { condition: 'service_started' };

  services.nginx = {
    image: 'nginx:alpine',
    ports: ['80:80', '443:443'],
    volumes: ['./nginx/nginx.conf:/etc/nginx/nginx.conf:ro'],
    depends_on: nginxDepends,
    restart: 'unless-stopped',
  };

  // redis
  services.redis = {
    image: 'redis:7-alpine',
    restart: 'unless-stopped',
    volumes: ['redis_data:/data'],
  };

  // minio
  services.minio = {
    image: 'minio/minio',
    command: 'server /data --console-address ":9001"',
    ports: ['9000:9000', '9001:9001'],
    environment: {
      MINIO_ROOT_USER: 'nexopress',
      MINIO_ROOT_PASSWORD: 'nexopress123',
    },
    volumes: ['minio_data:/data'],
    restart: 'unless-stopped',
  };

  // each CMS
  selectedCMS.forEach(cmsName => {
    const svcKey = cmsName.replace(/-/g, '_');
    services[svcKey] = {
      build: {
        context: './cms-adapter',
        args: { CMS_NAME: cmsName },
      },
      env_file: [`./${cmsName}/.env`],
      volumes: [`./data/${cmsName}:/app/data`],
      depends_on: { redis: { condition: 'service_started' }, minio: { condition: 'service_started' } },
      restart: 'unless-stopped',
    };
  });

  // n8n (optional)
  if (n8nEnabled) {
    services.n8n = {
      image: 'n8nio/n8n',
      ports: ['5678:5678'],
      environment: {
        N8N_BASIC_AUTH_ACTIVE: 'true',
        N8N_BASIC_AUTH_USER: 'admin',
        N8N_BASIC_AUTH_PASSWORD: credentials.ADMIN_TOKEN || 'changeme',
        WEBHOOK_URL: 'http://localhost:5678/',
      },
      volumes: ['n8n_data:/home/node/.n8n'],
      restart: 'unless-stopped',
    };
  }

  // volumes
  const volumes = {
    redis_data: null,
    minio_data: null,
  };
  if (n8nEnabled) volumes.n8n_data = null;
  selectedCMS.forEach(cmsName => {
    const key = `${cmsName.replace(/-/g, '_')}_data`;
    volumes[key] = null;
  });

  const compose = {
    version: '3.8',
    services,
    volumes,
  };

  return yaml.dump(compose, { lineWidth: 120, noRefs: true });
}

/**
 * generateEnvFile(state, cmsName) → string
 */
function generateEnvFile(state, cmsName) {
  const { credentials = {}, sites = {}, sources = {} } = state;
  const cmsSites = sites[cmsName] || [];
  const n8nEnabled = sources.n8n && sources.n8n.enabled;

  const lines = [
    `# Auto-generated .env for ${cmsName}`,
    `# Generated: ${new Date().toISOString()}`,
    '',
    '# Core',
    `CMS_NAME=${cmsName}`,
    `PORT=3000`,
    `NODE_ENV=production`,
    '',
    '# Auth',
    `ADMIN_TOKEN=${credentials.ADMIN_TOKEN || ''}`,
    `ENGAGEMENT_WEBHOOK_SECRET=${credentials.ENGAGEMENT_WEBHOOK_SECRET || ''}`,
    '',
    '# Database',
    `DATABASE_URL=./data/${cmsName}.db`,
    '',
    '# Redis (KV)',
    `REDIS_URL=redis://redis:6379`,
    '',
    '# MinIO (R2-compatible)',
    `MINIO_ENDPOINT=http://minio:9000`,
    `MINIO_ACCESS_KEY=nexopress`,
    `MINIO_SECRET_KEY=nexopress123`,
    '',
    '# AI',
    `OPENROUTER_API_KEY=${credentials.OPENROUTER_API_KEY || ''}`,
    `AI_MODEL=${credentials.AI_MODEL || 'google/gemini-2.0-flash-exp:free'}`,
    '',
    '# Telegram',
    `TELEGRAM_BOT_TOKEN=${credentials.TELEGRAM_BOT_TOKEN || ''}`,
    `TELEGRAM_CHAT_ID=${credentials.TELEGRAM_CHAT_ID || ''}`,
    '',
    '# Facebook',
    `FB_APP_ID=${credentials.FB_APP_ID || ''}`,
    `FB_APP_SECRET=${credentials.FB_APP_SECRET || ''}`,
    '',
    '# News Sources',
    `NEWSAPI_KEY=${credentials.NEWSAPI_KEY || ''}`,
    `OPENWEATHER_API_KEY=${credentials.OPENWEATHER_API_KEY || ''}`,
  ];

  if (n8nEnabled && sources.n8n.webhookSecret) {
    lines.push('', '# n8n', `N8N_WEBHOOK_SECRET=${sources.n8n.webhookSecret}`);
  }

  if (cmsSites.length > 0) {
    lines.push('', '# Sites managed by this CMS');
    cmsSites.forEach((site, i) => {
      lines.push(`SITE_${i}_SLUG=${site.slug || ''}`);
      lines.push(`SITE_${i}_NOMBRE=${site.nombre || ''}`);
      lines.push(`SITE_${i}_DOMINIO=${site.dominio || ''}`);
      lines.push(`SITE_${i}_TAGLINE=${site.tagline || ''}`);
      lines.push(`SITE_${i}_ACTIVO=${site.activo ? 'true' : 'false'}`);
    });
  }

  return lines.join('\n') + '\n';
}

/**
 * generateNginxConf(state) → string
 */
function generateNginxConf(state) {
  const { selectedCMS = [] } = state;

  const upstreams = selectedCMS.map(cms => {
    const svcKey = cms.replace(/-/g, '_');
    return `    upstream ${svcKey} {\n        server ${cms}:3000;\n    }`;
  }).join('\n\n');

  const locations = selectedCMS.map(cms => {
    const svcKey = cms.replace(/-/g, '_');
    return `
        location /${cms}/ {
            proxy_pass http://${svcKey}/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 120s;
            proxy_connect_timeout 10s;
        }`;
  }).join('\n');

  return `# Auto-generated nginx.conf
# Generated: ${new Date().toISOString()}

worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';
    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1000;

${upstreams}

    upstream wizard_upstream {
        server wizard:8080;
    }

    server {
        listen 80;
        server_name _;

        client_max_body_size 10m;

        # Wizard UI (default)
        location / {
            proxy_pass http://wizard_upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
${locations}

        # Health check
        location /health {
            access_log off;
            return 200 'ok';
            add_header Content-Type text/plain;
        }
    }
}
`;
}

/**
 * generateREADME(state) → string
 */
function generateREADME(state) {
  const { selectedCMS = [], sources = {} } = state;
  const n8nEnabled = sources.n8n && sources.n8n.enabled;
  const date = new Date().toISOString().split('T')[0];

  const serviceList = [
    '- **Wizard UI**: http://localhost/',
    '- **MinIO Console**: http://localhost:9001',
  ];
  if (n8nEnabled) serviceList.push('- **n8n**: http://localhost:5678');
  selectedCMS.forEach(cms => {
    serviceList.push(`- **${cms}** (via nginx): http://localhost/${cms}/`);
  });

  return `# NexoPress Docker Deploy
Generated: ${date}

## Quickstart

\`\`\`bash
cd nexopress-deploy
docker compose up -d
\`\`\`

Then open http://localhost in your browser.

## Services

${serviceList.join('\n')}

## Included CMS instances

${selectedCMS.map(c => `- \`${c}\``).join('\n') || '(none selected)'}

## Stopping

\`\`\`bash
docker compose down
\`\`\`

## Updating

\`\`\`bash
docker compose pull
docker compose up -d --build
\`\`\`

## Data persistence

All data is stored in named Docker volumes. To reset completely:

\`\`\`bash
docker compose down -v
\`\`\`

> **Warning**: this deletes all databases, uploaded images, and n8n workflows.

## Troubleshooting

View logs:
\`\`\`bash
docker compose logs -f
docker compose logs -f cms-originaux
\`\`\`

Check status:
\`\`\`bash
docker compose ps
\`\`\`
`;
}

// ── Validation ───────────────────────────────────────────────────────────────

function validateState(state) {
  const errors = [];
  const warnings = [];

  if (!state || typeof state !== 'object') {
    errors.push('state is required and must be an object');
    return { errors, warnings };
  }

  const creds = state.credentials || {};

  if (!creds.ADMIN_TOKEN) errors.push('credentials.ADMIN_TOKEN is required');
  if (!creds.OPENROUTER_API_KEY) errors.push('credentials.OPENROUTER_API_KEY is required');

  if (!creds.FB_APP_ID) warnings.push('credentials.FB_APP_ID not set — Facebook auto-posting will be disabled');
  if (!creds.FB_APP_SECRET) warnings.push('credentials.FB_APP_SECRET not set — Facebook auto-posting will be disabled');
  if (!creds.TELEGRAM_BOT_TOKEN) warnings.push('credentials.TELEGRAM_BOT_TOKEN not set — Telegram notifications will be disabled');
  if (!creds.NEWSAPI_KEY) warnings.push('credentials.NEWSAPI_KEY not set — NewsAPI source will be unavailable');
  if (!creds.OPENWEATHER_API_KEY) warnings.push('credentials.OPENWEATHER_API_KEY not set — weather widget will be disabled');

  if (!state.selectedCMS || state.selectedCMS.length === 0) {
    warnings.push('No CMS instances selected — docker-compose will only include infrastructure services');
  }

  return { errors, warnings };
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), services: { wizard: true } });
});

// Generate config files
app.post('/api/deploy/generate', (req, res) => {
  try {
    const { state } = req.body;
    const { errors, warnings } = validateState(state);

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const selectedCMS = state.selectedCMS || [];

    const dockerCompose = generateDockerCompose(state);
    const nginx = generateNginxConf(state);

    const envFiles = {};
    selectedCMS.forEach(cmsName => {
      envFiles[cmsName] = generateEnvFile(state, cmsName);
    });

    // Master .env (shared top-level)
    const masterEnv = generateEnvFile(state, 'master');

    const readme = generateREADME(state);

    const generatedFiles = { dockerCompose, envFiles, nginx, masterEnv, readme };
    const token = issueToken(generatedFiles);

    return res.json({ dockerCompose, envFiles, nginx, warnings, downloadToken: token });
  } catch (err) {
    console.error('[/api/deploy/generate]', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Download zip
app.get('/api/deploy/download', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token query param required' });

  const entry = deployState.tokens.get(token);
  if (!entry) return res.status(404).json({ error: 'Token not found or expired' });
  if (Date.now() - entry.createdAt > TOKEN_TTL_MS) {
    deployState.tokens.delete(token);
    return res.status(410).json({ error: 'Token expired' });
  }

  const { generatedFiles } = entry;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="nexopress-deploy.zip"');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => {
    console.error('[archiver]', err);
    if (!res.headersSent) res.status(500).end();
  });

  archive.pipe(res);

  archive.append(generatedFiles.dockerCompose, { name: 'docker-compose.yml' });
  archive.append(generatedFiles.masterEnv, { name: '.env' });
  archive.append(generatedFiles.nginx, { name: 'nginx/nginx.conf' });
  archive.append(generatedFiles.readme, { name: 'README-deploy.md' });

  Object.entries(generatedFiles.envFiles || {}).forEach(([cmsName, content]) => {
    archive.append(content, { name: `${cmsName}/.env` });
  });

  archive.finalize();
});

// Start deploy
app.post('/api/deploy/start', (req, res) => {
  if (deployState.status === 'running') {
    return res.status(409).json({ error: 'Deploy already in progress' });
  }

  const { state } = req.body;
  const { errors, warnings } = validateState(state);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  // Check docker availability
  exec('docker --version', (dockerErr) => {
    if (dockerErr) {
      return res.status(500).json({ error: 'docker not found on PATH', details: dockerErr.message });
    }

    exec('docker compose version', (composeErr) => {
      if (composeErr) {
        return res.status(500).json({ error: 'docker compose not found', details: composeErr.message });
      }

      // Prepare deploy directory
      const deployDir = '/tmp/nexopress-deploy';
      try {
        fs.mkdirSync(deployDir, { recursive: true });
        fs.mkdirSync(path.join(deployDir, 'nginx'), { recursive: true });

        const selectedCMS = state.selectedCMS || [];
        selectedCMS.forEach(cmsName => {
          fs.mkdirSync(path.join(deployDir, cmsName), { recursive: true });
          fs.writeFileSync(path.join(deployDir, cmsName, '.env'), generateEnvFile(state, cmsName));
        });

        fs.writeFileSync(path.join(deployDir, 'docker-compose.yml'), generateDockerCompose(state));
        fs.writeFileSync(path.join(deployDir, '.env'), generateEnvFile(state, 'master'));
        fs.writeFileSync(path.join(deployDir, 'nginx', 'nginx.conf'), generateNginxConf(state));
        fs.writeFileSync(path.join(deployDir, 'README-deploy.md'), generateREADME(state));
      } catch (fsErr) {
        return res.status(500).json({ error: 'Failed to write deploy files', details: fsErr.message });
      }

      // Respond immediately
      res.json({ status: 'started', deployDir, warnings });

      // Run deploy asynchronously
      deployState.status = 'running';
      deployState.progress = 0;
      deployState.logs = [];
      pushLog('[INFO] Starting docker compose up -d --build ...');

      const child = spawn('docker', ['compose', 'up', '-d', '--build'], {
        cwd: deployDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const handleLine = (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        lines.forEach(line => {
          pushLog(line);
          // Rough progress heuristic
          if (deployState.progress < 90) deployState.progress += 2;
        });
      };

      child.stdout.on('data', handleLine);
      child.stderr.on('data', handleLine);

      child.on('close', (code) => {
        if (code === 0) {
          deployState.status = 'done';
          deployState.progress = 100;
          pushLog('[INFO] Deploy completed successfully.');
        } else {
          deployState.status = 'error';
          pushLog(`[ERROR] docker compose exited with code ${code}`);
        }
      });

      child.on('error', (err) => {
        deployState.status = 'error';
        pushLog(`[ERROR] spawn error: ${err.message}`);
      });
    });
  });
});

// Deploy status
app.get('/api/deploy/status', (_req, res) => {
  res.json({
    status: deployState.status,
    progress: deployState.progress,
    lastLine: deployState.lastLine,
  });
});

// SSE log stream
app.get('/api/deploy/logs', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (deployState.status === 'idle') {
    res.write('data: [IDLE] No deploy in progress\n\n');
    res.end();
    return;
  }

  // Send buffered logs
  const snapshot = [...deployState.logs];
  snapshot.forEach(line => res.write(`data: ${line}\n\n`));

  // Poll for new lines
  let lastIndex = deployState.logs.length;
  const interval = setInterval(() => {
    const newLines = deployState.logs.slice(lastIndex);
    newLines.forEach(line => res.write(`data: ${line}\n\n`));
    lastIndex = deployState.logs.length;

    if (deployState.status === 'done' || deployState.status === 'error') {
      res.write(`data: [STATUS] ${deployState.status.toUpperCase()}\n\n`);
      clearInterval(interval);
      res.end();
    }
  }, 500);

  req.on('close', () => clearInterval(interval));
});

// n8n webhook forwarder
app.post('/api/n8n/webhook', async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  const { title, content, description, category, sourceUrl, imageUrl, sitioDestino, cmsTarget } = req.body;

  const missing = [];
  if (!title) missing.push('title');
  if (!content) missing.push('content');
  if (!cmsTarget) missing.push('cmsTarget');
  if (!sitioDestino) missing.push('sitioDestino');

  if (missing.length > 0) {
    return res.status(400).json({ error: 'Missing required fields', fields: missing });
  }

  const cmsHost = `http://cms-${cmsTarget}:3000`;
  const targetUrl = `${cmsHost}/api/articles`;

  try {
    // Use built-in fetch (Node 18+) or fallback
    const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
    const response = await fetchFn(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ADMIN_TOKEN || ''}`,
      },
      body: JSON.stringify({ title, content, description, category, sourceUrl, imageUrl, sitioDestino }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({ error: 'Upstream CMS error', status: response.status, body });
    }

    return res.json({ success: true, article: body });
  } catch (err) {
    console.error('[/api/n8n/webhook]', err);
    return res.status(502).json({ error: 'Failed to reach CMS', details: err.message });
  }
});

// ── AI Generation API ─────────────────────────────────────────────────────────

/**
 * POST /api/ai/generate
 * Body: { description: string, model?: string }
 * Returns: { palette, tagline, description, categories }
 *
 * Usa OpenRouter (OPENROUTER_API_KEY) con Gemini 2.0 Flash.
 * Si no hay API key, devuelve sugerencias de ejemplo para desarrollo.
 */
app.post('/api/ai/generate', async (req, res) => {
  const { description } = req.body;
  if (!description?.trim()) {
    return res.status(400).json({ error: 'Falta el campo "description".' });
  }

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    // Dev fallback: paleta de ejemplo para no bloquear el wizard sin API key
    console.warn('[/api/ai/generate] OPENROUTER_API_KEY no configurada. Usando respuesta de ejemplo.');
    return res.json({
      palette:     { primary: '#1a3a5c', secondary: '#2d5a87', light: '#e8f4fd', text: '#1a1a1a' },
      tagline:     'Tu fuente de noticias de confianza',
      description: 'Cobertura periodística independiente con rigor y profundidad.',
      categories:  [
        { id: 'nacional',  label: 'Nacional'  },
        { id: 'economia',  label: 'Economía'  },
        { id: 'politica',  label: 'Política'  },
        { id: 'tecnologia',label: 'Tecnología'},
        { id: 'mundo',     label: 'Mundo'     },
      ],
      _fallback: true,
    });
  }

  const model = req.body.model || 'google/gemini-2.0-flash-001';
  const systemPrompt = `Eres un asistente de diseño para NexoPress, una plataforma de medios digitales.
Tu tarea es generar tokens de diseño y metadatos editoriales para un sitio de noticias.
Responde SOLO con JSON válido, sin markdown, sin explicaciones.`;

  const userPrompt = `Descripción del sitio: "${description}"

Genera la siguiente estructura JSON:
{
  "palette": {
    "primary":   "#RRGGBB",
    "secondary": "#RRGGBB",
    "light":     "#RRGGBB",
    "text":      "#RRGGBB"
  },
  "tagline": "Eslogan corto (max 8 palabras)",
  "description": "Meta description SEO (max 160 caracteres)",
  "categories": [
    { "id": "slug-sin-tildes", "label": "Etiqueta con tilde si aplica" }
  ]
}

Reglas:
- palette.primary: color principal de marca (header, accents). Acorde al tono editorial.
- palette.secondary: variante más oscura o más clara de primary.
- palette.light: tono muy claro para fondos (alta luminosidad, baja saturación).
- palette.text: casi negro para buena legibilidad (#111–#333).
- Genera exactamente 5 categorías relevantes al foco editorial descrito.
- IDs: minúsculas, sin tildes, sin espacios, max 20 chars.`;

  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://nexopress.sebastianvernis.space',
        'X-Title':       'NexoPress Visual Builder',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
        temperature: 0.7,
        max_tokens:  600,
      }),
    });

    if (!orRes.ok) {
      const errBody = await orRes.text();
      console.error('[/api/ai/generate] OpenRouter error:', orRes.status, errBody);
      return res.status(502).json({ error: `OpenRouter error ${orRes.status}: ${errBody.slice(0, 200)}` });
    }

    const orData = await orRes.json();
    const raw = orData.choices?.[0]?.message?.content ?? '';

    // Extraer JSON — OpenRouter a veces incluye ``` aunque se le diga que no
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'La IA no devolvió JSON válido.', raw: raw.slice(0, 300) });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validación mínima
    if (!parsed.palette?.primary || !Array.isArray(parsed.categories)) {
      return res.status(502).json({ error: 'Respuesta incompleta de la IA.', parsed });
    }

    return res.json(parsed);
  } catch (err) {
    console.error('[/api/ai/generate]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Site Builder API ─────────────────────────────────────────────────────────
// Carga el paquete @nexopress/site-builder (ESM) de forma dinámica desde CJS.
// Los endpoints delegan validación, generación y deploy al paquete.

/**
 * POST /api/sites/validate
 * Body: site.config JSON
 * Returns: { valid: boolean, errors: [{field, message}] }
 */
app.post('/api/sites/validate', async (req, res) => {
  try {
    const { validateConfig } = await import('../../packages/site-builder/index.mjs');
    const result = validateConfig(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ valid: false, errors: [{ field: 'server', message: err.message }] });
  }
});

/**
 * POST /api/sites/create
 * Body: { config: SiteConfig, outDir?: string, skipDeploy?: boolean, dryRun?: boolean }
 *
 * Responde con Server-Sent Events (text/event-stream).
 * Eventos:
 *   data: { type: 'progress', step, percent, message }
 *   data: { type: 'log', line }
 *   data: { type: 'result', success, phase, url?, errors? }
 */
app.post('/api/sites/create', async (req, res) => {
  const { config, skipDeploy = false, dryRun = false } = req.body;

  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: 'Falta el campo "config" en el body.' });
  }

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx: desactivar buffering
  res.flushHeaders();

  function send(obj) {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  }

  try {
    const { SiteBuilder } = await import('../../packages/site-builder/index.mjs');

    // Directorio de salida: temporal por defecto, o el especificado en el body
    const outDir = req.body.outDir
      ? path.resolve(req.body.outDir)
      : path.join(os.tmpdir(), `nexopress-${config.name ?? 'site'}-${Date.now()}`);

    const builder = new SiteBuilder();

    builder.on('progress', (data) => send({ type: 'progress', ...data }));
    builder.on('log',      (line) => send({ type: 'log', line }));

    const result = await builder.run({
      config,
      outDir,
      skipDeploy,
      dryRun,
      apiToken:  process.env.CLOUDFLARE_API_TOKEN,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    });

    send({
      type:         'result',
      success:      result.success,
      phase:        result.phase,
      url:          result.deployResult?.url ?? null,
      outDir:       dryRun ? null : outDir,
      filesChanged: result.createResult?.filesChanged ?? 0,
      errors:       [
        ...(result.validationErrors?.map(e => `${e.field}: ${e.message}`) ?? []),
        ...(result.createResult?.errors ?? []),
        ...(result.deployResult?.errors ?? []),
      ],
    });

  } catch (err) {
    console.error('[/api/sites/create]', err);
    send({ type: 'result', success: false, phase: 'server', errors: [err.message] });
  }

  res.end();
});

/**
 * GET /api/sites/check-wrangler
 * Returns: { available: boolean, version?: string }
 */
app.get('/api/sites/check-wrangler', async (_req, res) => {
  try {
    const { checkWrangler } = await import('../../packages/site-builder/index.mjs');
    const result = await checkWrangler();
    res.json(result);
  } catch (err) {
    res.status(500).json({ available: false, error: err.message });
  }
});

// Catch-all → SPA
app.get('*', (_req, res) => {
  const index = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(index)) {
    res.sendFile(index);
  } else {
    res.status(404).send('Wizard UI not found. Place your frontend in the public/ directory.');
  }
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[nexopress-wizard] Listening on http://0.0.0.0:${PORT}`);
});

module.exports = app; // for testing
