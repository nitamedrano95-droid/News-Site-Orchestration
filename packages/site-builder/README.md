# @nexopress/site-builder

Generador y desplegador de sitios de noticias para NexoPress.
Úsalo como **librería** en tu wizard o como **CLI** desde terminal.

---

## Instalación (en el monorepo)

```bash
# Desde la raíz del monorepo — ya referenciado como workspace
npm install
```

Para usarlo en otro paquete del monorepo:

```json
{
  "dependencies": {
    "@nexopress/site-builder": "workspace:*"
  }
}
```

---

## API programática (para el wizard)

```js
import { SiteBuilder } from '@nexopress/site-builder'

const builder = new SiteBuilder()
// Opcional: sobreescribe el template
// const builder = new SiteBuilder({ templateDir: '/ruta/a/mi/template' })

// Escuchar progreso (para SSE / WebSocket al frontend)
builder.on('progress', ({ step, percent, message }) => {
  console.log(`[${step}] ${percent}% — ${message}`)
  // Enviar al cliente: res.write(`data: ${JSON.stringify({step, percent, message})}\n\n`)
})

builder.on('log', (line) => {
  // Líneas raw de wrangler durante el deploy
})

// Pipeline completo: validar → generar → desplegar
const result = await builder.run({
  config:      siteConfig,         // objeto validado
  outDir:      '/tmp/mi-sitio',    // directorio de salida
  skipDeploy:  false,              // true = solo generar
  dryRun:      false,              // true = no escribir al disco
  apiToken:    process.env.CLOUDFLARE_API_TOKEN,
  accountId:   process.env.CLOUDFLARE_ACCOUNT_ID,
})

if (result.success) {
  console.log('URL:', result.deployResult?.url)
} else {
  console.error('Falló en:', result.phase, result.validationErrors ?? result.createResult?.errors)
}
```

### Solo validar (sin tocar el disco)

```js
import { validateConfig } from '@nexopress/site-builder'

const { valid, errors } = validateConfig(siteConfig)
// errors: [{ field: 'theme.primary', message: 'Debe ser un color hex...' }]
```

### Solo generar (sin desplegar)

```js
import { SiteBuilder } from '@nexopress/site-builder'

const builder = new SiteBuilder()
builder.on('progress', ({ percent, message }) => process.stdout.write(`\r${percent}% ${message}`))

const result = await builder.create({ config, outDir: './sites/mi-sitio' })
// result: { success, filesScanned, filesChanged, errors }
```

### Solo desplegar

```js
import { deploySite } from '@nexopress/site-builder'

const result = await deploySite({
  outDir:      './sites/mi-sitio',
  projectName: 'mi-sitio',
  branch:      'master',
  apiToken:    process.env.CLOUDFLARE_API_TOKEN,
})
// result: { success, url, logs, errors }
```

---

## CLI

```bash
# Generar + desplegar
nexopress-site create --config ./mi-sitio.json --out ./sites/mi-sitio

# Solo generar (sin deploy)
nexopress-site create --config ./mi-sitio.json --out ./sites/mi-sitio --skip-deploy

# Dry run (solo previsualizar)
nexopress-site create --config ./mi-sitio.json --out ./sites/mi-sitio --dry-run

# Validar config
nexopress-site validate --config ./mi-sitio.json

# Verificar wrangler
nexopress-site check-wrangler
```

---

## Formato de site.config.json

```json
{
  "$schema": "../../_template-clean/site.config.schema.json",
  "name": "mi-diario",
  "title": "Mi Diario Digital",
  "tagline": "Tu fuente de noticias locales",
  "description": "Noticias de la región, política y economía.",
  "prefix": "midr",
  "cms": {
    "host": "cms-nuevos3.sebastianvernis.workers.dev"
  },
  "theme": {
    "primary":   "#1a3a5c",
    "secondary": "#2d5a87",
    "light":     "#e8f4fd",
    "text":      "#1a1a1a"
  },
  "categories": [
    { "id": "nacional",  "label": "Nacional" },
    { "id": "politica",  "label": "Política" },
    { "id": "economia",  "label": "Economía" }
  ],
  "social": {
    "facebook": "https://facebook.com/mi-diario"
  },
  "deploy": {
    "projectName": "mi-diario",
    "branch": "master"
  }
}
```

---

## Eventos emitidos por SiteBuilder

| Evento     | Payload                                      | Cuándo                              |
|------------|----------------------------------------------|-------------------------------------|
| `progress` | `{ step, percent, message }`                 | Durante todo el pipeline            |
| `log`      | `string`                                     | Líneas raw de wrangler (deploy)     |
| `done`     | `RunResult`                                  | Al finalizar con éxito              |
| `error`    | `Error`                                      | Al fallar con error no recuperable  |

**Steps de progreso:** `validate` → `copy` → `transform` → `rebuild` → `deploy` → `done`

---

## Integración con wizard (Express SSE)

```js
import { SiteBuilder } from '@nexopress/site-builder'

// POST /api/sites/create
app.post('/api/sites/create', async (req, res) => {
  const { config, outDir, skipDeploy } = req.body

  // SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const builder = new SiteBuilder()

  builder.on('progress', (data) => {
    res.write(`data: ${JSON.stringify({ type: 'progress', ...data })}\n\n`)
  })

  builder.on('log', (line) => {
    res.write(`data: ${JSON.stringify({ type: 'log', line })}\n\n`)
  })

  const result = await builder.run({
    config,
    outDir,
    skipDeploy,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
  })

  res.write(`data: ${JSON.stringify({ type: 'result', ...result })}\n\n`)
  res.end()
})

// GET /api/sites/validate  (quick, sin SSE)
app.post('/api/sites/validate', (req, res) => {
  const { validateConfig } = require('@nexopress/site-builder')
  const { valid, errors } = validateConfig(req.body)
  res.json({ valid, errors })
})
```
