// ConnectionRescue API server.
//
// Run with:   cd backend && cp .env.example .env && npm install && npm start
//
// This is the ONLY place that holds AviationStack / Stripe / Supabase service-role
// keys. The React app talks to this server via VITE_BACKEND_URL — never
// directly to those providers from the browser.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import flightsRouter from './routes/flights.js';
import paymentsRouter from './routes/payments.js';
import webhooksRouter from './routes/webhooks.js';
import feedbackRouter from './routes/feedback.js';
import delayReportsRouter from './routes/delayReports.js';

const DEFAULT_ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174';
const REQUIRED_RUNTIME_ENV = [
  'FRONTEND_URL',
  'AVIATIONSTACK_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function shouldRequireFullConfig() {
  if (String(process.env.REQUIRE_FULL_CONFIG || '').trim() === '1') return true;
  return process.env.NODE_ENV === 'production';
}

function listMissingRuntimeConfig() {
  return REQUIRED_RUNTIME_ENV.filter((name) => !String(process.env[name] || '').trim());
}

function log(level, message, extra = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    service: 'connectionrescue-api',
    message,
    ...extra,
  };
  if (level === 'error') {
    console.error(JSON.stringify(payload));
    return;
  }
  console.log(JSON.stringify(payload));
}

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();
  app.disable('x-powered-by');
  app.set('trust proxy', process.env.TRUST_PROXY === '1');

  app.use((req, res, next) => {
    const start = Date.now();
    const requestId = req.get('x-request-id') || randomUUID();
    res.setHeader('x-request-id', requestId);
    res.locals.requestId = requestId;

    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');

    res.on('finish', () => {
      if (req.path === '/health') return;
      log('info', 'request_complete', {
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
        ip: req.ip,
      });
    });
    next();
  });

  // CORS: only allow the frontend(s) we know about.
  app.use(cors({
    origin: (origin, cb) => {
      // No origin = curl / server-to-server, allow.
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      const err = new Error(`CORS: ${origin} not allowed`);
      err.status = 403;
      err.code = 'cors_not_allowed';
      return cb(err);
    },
    credentials: true,
  }));

  // IMPORTANT: Stripe webhook must see the raw body for signature verification,
  // so we mount it BEFORE the global express.json() middleware.
  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use('/api/webhooks', webhooksRouter);

  // Everything else is JSON.
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({
    ok: true,
    service: 'connectionrescue-api',
    uptime: process.uptime(),
    aviationstack: !!process.env.AVIATIONSTACK_API_KEY,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    supabase: !!process.env.SUPABASE_URL,
  }));

  app.use('/api/flights', flightsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/feedback', feedbackRouter);
  app.use('/api', delayReportsRouter);

  // Final 404 / error handlers.
  app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));
  app.use((err, _req, res, _next) => {
    const requestId = res.locals.requestId || null;
    const isJsonSyntaxError = err instanceof SyntaxError && err.status === 400 && 'body' in err;
    const statusCode = isJsonSyntaxError ? 400 : (err.status || err.statusCode || 500);
    const errorCode = isJsonSyntaxError ? 'invalid_json' : (err.code || err.error || 'internal_error');
    const message = statusCode >= 500 ? 'Internal server error' : err.message;

    log('error', 'request_failed', {
      requestId,
      statusCode,
      errorCode,
      message: err.message,
      stack: err.stack,
    });

    res.status(statusCode).json({ error: errorCode, message, requestId });
  });

  return app;
}

export function startServer() {
  const missingConfig = listMissingRuntimeConfig();
  if (missingConfig.length) {
    const warning = `Missing runtime env: ${missingConfig.join(', ')}`;
    if (shouldRequireFullConfig()) {
      throw new Error(warning);
    }
    log('warn', warning, { strictConfigRequired: false });
  }

  const app = createApp();
  const allowedOrigins = getAllowedOrigins();
  const port = process.env.PORT || 8788;

  const server = app.listen(port, () => {
    log('info', 'server_started', {
      port,
      aviationstackConfigured: !!process.env.AVIATIONSTACK_API_KEY,
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      supabaseConfigured: !!process.env.SUPABASE_URL,
      corsOrigins: allowedOrigins,
    });
  });

  const shutdown = (signal) => {
    log('info', 'shutdown_requested', { signal });
    server.close(() => {
      log('info', 'server_stopped');
      process.exit(0);
    });

    setTimeout(() => {
      log('error', 'shutdown_timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  startServer();
}
