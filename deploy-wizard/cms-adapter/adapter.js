/**
 * adapter.js — NexoPress Hono Worker → Node.js Adapter
 *
 * Polyfills Cloudflare Workers bindings:
 *   - env.DB          → D1  → better-sqlite3 (local SQLite file)
 *   - env.ARTICLES_KV → KV  → ioredis (Redis)
 *   - env.UPLOADS     → R2  → @aws-sdk/client-s3 (MinIO)
 *
 * All original CMS source files are bind-mounted at ./src/
 * Migrations SQL files are bind-mounted at ./migrations/
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import Redis from 'ioredis';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Configuration ─────────────────────────────────────────────────────────────

const CMS_NAME    = process.env.CMS_NAME    || 'cms-originaux';
const PORT        = parseInt(process.env.PORT || '3000', 10);
const DB_PATH     = process.env.DATABASE_URL || path.join(__dirname, 'data', 'cms.db');
const REDIS_URL   = process.env.REDIS_URL    || 'redis://localhost:6379';
const MINIO_ENDPOINT   = process.env.MINIO_ENDPOINT   || 'http://localhost:9000';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'nexopress';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'nexopress123';
const MINIO_BUCKET     = process.env.MINIO_BUCKET     || 'cms-news';
const MINIO_REGION     = process.env.MINIO_REGION     || 'us-east-1';

// ── SQLite / D1 Polyfill ──────────────────────────────────────────────────────

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

/**
 * D1-compatible polyfill backed by better-sqlite3.
 * Mimics: prepare().bind().run() / .first() / .all()
 *         exec()
 *         batch()
 */
const d1Polyfill = {
  prepare(sql) {
    let boundArgs = [];

    const getStmt = () => {
      try {
        return sqlite.prepare(sql);
      } catch (err) {
        console.error(`[D1] prepare error for SQL:\n${sql}\n`, err.message);
        throw err;
      }
    };

    const bound = {
      bind(...args) {
        boundArgs = args;
        return bound;
      },
      run(...extraArgs) {
        const args = extraArgs.length ? extraArgs : boundArgs;
        try {
          const stmt = getStmt();
          const info = stmt.run(...args);
          return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        } catch (err) {
          console.error(`[D1] run error:`, err.message);
          throw err;
        }
      },
      first(...extraArgs) {
        const args = extraArgs.length ? extraArgs : boundArgs;
        try {
          const stmt = getStmt();
          return stmt.get(...args) ?? null;
        } catch (err) {
          console.error(`[D1] first error:`, err.message);
          throw err;
        }
      },
      all(...extraArgs) {
        const args = extraArgs.length ? extraArgs : boundArgs;
        try {
          const stmt = getStmt();
          return { results: stmt.all(...args), success: true };
        } catch (err) {
          console.error(`[D1] all error:`, err.message);
          throw err;
        }
      },
    };
    return bound;
  },

  exec(sql) {
    try {
      sqlite.exec(sql);
      return { success: true };
    } catch (err) {
      console.error(`[D1] exec error:`, err.message);
      throw err;
    }
  },

  async batch(statements) {
    const runAll = sqlite.transaction(() => statements.map(s => s.run()));
    return runAll();
  },
};

// ── Redis / KV Polyfill ───────────────────────────────────────────────────────

const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableOfflineQueue: true,
  retryStrategy(times) {
    if (times > 10) return null; // stop retrying
    return Math.min(times * 200, 2000);
  },
});

redis.on('error', (err) => console.error('[Redis] Connection error:', err.message));
redis.on('connect', () => console.log('[Redis] Connected'));

// Key prefix per CMS to avoid collisions when sharing Redis
const KV_PREFIX = `${CMS_NAME}:`;

/**
 * KV-compatible polyfill backed by Redis.
 * Mimics Cloudflare KV: get / put / delete / list
 */
const kvPolyfill = {
  async get(key, type) {
    try {
      const val = await redis.get(`${KV_PREFIX}${key}`);
      if (val === null) return null;
      if (type === 'json') return JSON.parse(val);
      return val;
    } catch (err) {
      console.error(`[KV] get error for key ${key}:`, err.message);
      return null;
    }
  },

  async put(key, value, opts) {
    try {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const redisKey = `${KV_PREFIX}${key}`;
      if (opts?.expirationTtl) {
        await redis.setex(redisKey, opts.expirationTtl, serialized);
      } else if (opts?.expiration) {
        const ttl = opts.expiration - Math.floor(Date.now() / 1000);
        if (ttl > 0) await redis.setex(redisKey, ttl, serialized);
        else await redis.set(redisKey, serialized);
      } else {
        await redis.set(redisKey, serialized);
      }
    } catch (err) {
      console.error(`[KV] put error for key ${key}:`, err.message);
    }
  },

  async delete(key) {
    try {
      await redis.del(`${KV_PREFIX}${key}`);
    } catch (err) {
      console.error(`[KV] delete error for key ${key}:`, err.message);
    }
  },

  async list({ prefix = '', cursor, limit = 1000 } = {}) {
    try {
      const pattern = `${KV_PREFIX}${prefix}*`;
      let keys = [];
      let scanCursor = '0';
      do {
        const [nextCursor, found] = await redis.scan(scanCursor, 'MATCH', pattern, 'COUNT', 200);
        keys.push(...found);
        scanCursor = nextCursor;
      } while (scanCursor !== '0');

      // Strip CMS prefix before returning keys to caller
      const stripped = keys.map(k => ({ name: k.slice(KV_PREFIX.length) }));
      return { keys: stripped.slice(0, limit), list_complete: stripped.length <= limit, cursor: null };
    } catch (err) {
      console.error(`[KV] list error:`, err.message);
      return { keys: [], list_complete: true };
    }
  },
};

// ── MinIO / R2 Polyfill ───────────────────────────────────────────────────────

const s3Client = new S3Client({
  endpoint: MINIO_ENDPOINT,
  region: MINIO_REGION,
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // required for MinIO
});

// Ensure bucket exists at startup
async function ensureBucket() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: MINIO_BUCKET }));
    console.log(`[MinIO] Bucket "${MINIO_BUCKET}" exists`);
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      await s3Client.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }));
      console.log(`[MinIO] Bucket "${MINIO_BUCKET}" created`);
    } else {
      console.warn(`[MinIO] Could not verify bucket: ${err.message}`);
    }
  }
}

/**
 * R2-compatible polyfill backed by MinIO / S3.
 * Mimics: put / get / delete / head
 */
const r2Polyfill = {
  async put(key, body, opts = {}) {
    try {
      let bodyBuffer;
      if (body instanceof ArrayBuffer) {
        bodyBuffer = Buffer.from(body);
      } else if (Buffer.isBuffer(body)) {
        bodyBuffer = body;
      } else if (typeof body === 'string') {
        bodyBuffer = Buffer.from(body, 'utf8');
      } else {
        bodyBuffer = body;
      }

      await s3Client.send(new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
        Body: bodyBuffer,
        ContentType: opts.httpMetadata?.contentType || 'application/octet-stream',
        Metadata: opts.customMetadata || {},
      }));

      return {
        key,
        version: null,
        size: bodyBuffer?.length ?? 0,
        etag: null,
        httpMetadata: opts.httpMetadata || {},
        customMetadata: opts.customMetadata || {},
        uploaded: new Date().toISOString(),
      };
    } catch (err) {
      console.error(`[R2] put error for key ${key}:`, err.message);
      throw err;
    }
  },

  async get(key) {
    try {
      const response = await s3Client.send(new GetObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
      }));

      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const bodyBuffer = Buffer.concat(chunks);

      return {
        key,
        body: bodyBuffer,
        arrayBuffer: async () => bodyBuffer.buffer.slice(bodyBuffer.byteOffset, bodyBuffer.byteOffset + bodyBuffer.byteLength),
        text: async () => bodyBuffer.toString('utf8'),
        json: async () => JSON.parse(bodyBuffer.toString('utf8')),
        httpMetadata: { contentType: response.ContentType },
        customMetadata: response.Metadata || {},
        size: bodyBuffer.length,
      };
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
      console.error(`[R2] get error for key ${key}:`, err.message);
      throw err;
    }
  },

  async delete(key) {
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
    } catch (err) {
      console.error(`[R2] delete error for key ${key}:`, err.message);
    }
  },

  async head(key) {
    try {
      const response = await s3Client.send(new HeadObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
      return {
        key,
        size: response.ContentLength,
        etag: response.ETag,
        httpMetadata: { contentType: response.ContentType },
        customMetadata: response.Metadata || {},
        uploaded: response.LastModified?.toISOString(),
      };
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return null;
      console.error(`[R2] head error for key ${key}:`, err.message);
      throw err;
    }
  },

  async createMultipartUpload(key, opts) {
    // Simplified: just return a stub that wraps put
    return { key, uploadId: crypto.randomUUID() };
  },
};

// ── Migrations ────────────────────────────────────────────────────────────────

/**
 * Runs all .sql migration files in ./migrations/ in lexicographic order.
 * Tracks applied migrations in a _migrations table.
 */
export function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('[Migrations] No migrations directory found, skipping.');
    return;
  }

  // Create tracking table if it doesn't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = new Set(
    sqlite.prepare('SELECT filename FROM _migrations').all().map(r => r.filename)
  );

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[Migrations] No SQL migration files found.');
    return;
  }

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[Migrations] Skipping already applied: ${file}`);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      sqlite.exec(sql);
      sqlite.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
      console.log(`[Migrations] Applied: ${file}`);
    } catch (err) {
      console.error(`[Migrations] Error applying ${file}:`, err.message);
      // Non-fatal: some migrations may fail if objects already exist (IF NOT EXISTS guards it)
      // Still record as applied so we don't retry endlessly
      try {
        sqlite.prepare('INSERT OR IGNORE INTO _migrations (filename) VALUES (?)').run(file);
      } catch (_) {
        // ignore
      }
    }
  }

  console.log('[Migrations] All migrations processed.');
}

// ── Build env object (simulates Cloudflare Workers `env`) ────────────────────

function buildEnv() {
  return {
    // Core bindings
    DB:          d1Polyfill,
    ARTICLES_KV: kvPolyfill,
    UPLOADS:     r2Polyfill,

    // Spread all process.env vars so route handlers can access them via c.env.*
    ...process.env,

    // Explicit overrides for well-known env var names used in the CMS source
    CMS_NAME,
    ENVIRONMENT:              process.env.ENVIRONMENT              || 'production',
    ADMIN_TOKEN:              process.env.ADMIN_TOKEN              || '',
    ENGAGEMENT_WEBHOOK_SECRET: process.env.ENGAGEMENT_WEBHOOK_SECRET || '',
    OPENROUTER_API_KEY:       process.env.OPENROUTER_API_KEY       || '',
    AI_MODEL:                 process.env.AI_MODEL                 || 'google/gemini-2.0-flash-exp',
    TELEGRAM_BOT_TOKEN:       process.env.TELEGRAM_BOT_TOKEN       || '',
    TELEGRAM_CHAT_ID:         process.env.TELEGRAM_CHAT_ID         || '',
    FB_APP_ID:                process.env.FB_APP_ID                || '',
    FB_APP_SECRET:            process.env.FB_APP_SECRET            || '',
    NEWSAPI_KEY:              process.env.NEWSAPI_KEY              || '',
    OPENWEATHER_API_KEY:      process.env.OPENWEATHER_API_KEY      || '',
  };
}

// ── Scheduled cron (replaces Cloudflare scheduled handler) ───────────────────

function startCronScheduler(app) {
  // Run master cron every 3 hours (matches Cloudflare cron "0 */3 * * *")
  const CRON_INTERVAL_MS = 3 * 60 * 60 * 1000;

  async function runCron() {
    console.log('[Cron] Running scheduled task...');
    try {
      // Trigger via internal HTTP call to the cron endpoint
      const res = await fetch(`http://127.0.0.1:${PORT}/api/cron/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN || ''}`,
        },
      });
      console.log(`[Cron] Response: ${res.status}`);
    } catch (err) {
      console.error('[Cron] Error running scheduled task:', err.message);
    }
  }

  // Run shortly after startup, then on interval
  setTimeout(runCron, 30_000);
  setInterval(runCron, CRON_INTERVAL_MS);
  console.log(`[Cron] Scheduler started, interval: ${CRON_INTERVAL_MS / 1000}s`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[Adapter] Starting NexoPress adapter for ${CMS_NAME}...`);

  // Connect Redis
  try {
    await redis.connect();
  } catch (err) {
    console.warn('[Redis] Initial connection failed, will retry:', err.message);
  }

  // Ensure MinIO bucket
  try {
    await ensureBucket();
  } catch (err) {
    console.warn('[MinIO] Could not set up bucket at startup:', err.message);
  }

  // Run DB migrations
  runMigrations();

  // Dynamically import the CMS Hono app
  let cmsApp;
  try {
    const mod = await import('./src/index.js');
    cmsApp = mod.default;
  } catch (err) {
    console.error('[Adapter] Failed to load CMS app from ./src/index.js:', err.message);
    process.exit(1);
  }

  // Wrap with env injection middleware
  const wrapper = new Hono();
  const env = buildEnv();

  wrapper.use('*', async (c, next) => {
    // Inject polyfilled bindings into every request context
    c.env = env;
    await next();
  });

  // If the CMS exports a Hono app directly, mount it
  if (cmsApp && typeof cmsApp.fetch === 'function' && !(cmsApp.fetch.length === 3)) {
    // Standard Hono app
    wrapper.route('/', cmsApp);
  } else if (cmsApp && typeof cmsApp.fetch === 'function') {
    // Cloudflare Worker default export with fetch(request, env, ctx)
    wrapper.all('*', async (c) => {
      const response = await cmsApp.fetch(c.req.raw, env, {
        waitUntil: (p) => p.catch(err => console.error('[waitUntil]', err.message)),
        passThroughOnException: () => {},
      });
      return response;
    });
  } else {
    console.error('[Adapter] CMS module does not export a valid Hono app or Worker fetch handler');
    process.exit(1);
  }

  // Health check at adapter level (before the CMS routes)
  wrapper.get('/__adapter/health', (c) => c.json({
    status: 'ok',
    cms: CMS_NAME,
    timestamp: new Date().toISOString(),
    db: DB_PATH,
    redis: REDIS_URL,
    minio: MINIO_ENDPOINT,
  }));

  // Start HTTP server
  serve(
    { fetch: wrapper.fetch, port: PORT, hostname: '0.0.0.0' },
    (info) => {
      console.log(`[Adapter] ${CMS_NAME} listening on http://0.0.0.0:${info.port}`);
      startCronScheduler(wrapper);
    }
  );
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Adapter] SIGTERM received, shutting down...');
  try { await redis.quit(); } catch (_) {}
  try { sqlite.close(); } catch (_) {}
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Adapter] SIGINT received, shutting down...');
  try { await redis.quit(); } catch (_) {}
  try { sqlite.close(); } catch (_) {}
  process.exit(0);
});

main().catch((err) => {
  console.error('[Adapter] Fatal error:', err);
  process.exit(1);
});
