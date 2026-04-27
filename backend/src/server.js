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

import flightsRouter from './routes/flights.js';
import paymentsRouter from './routes/payments.js';
import webhooksRouter from './routes/webhooks.js';
import feedbackRouter from './routes/feedback.js';

const app = express();
const PORT = process.env.PORT || 8787;

// CORS: only allow the frontend(s) we know about.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // No origin = curl / server-to-server, allow.
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: ${origin} not allowed`));
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

// Final 404 / error handlers.
app.use((req, res) => res.status(404).json({ error: 'not_found', path: req.path }));
app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[connectionrescue-api] listening on :${PORT}`);
  console.log(`  aviation: ${process.env.AVIATIONSTACK_API_KEY ? 'configured' : 'MISSING'}`);
  console.log(`  stripe:   ${process.env.STRIPE_SECRET_KEY ? 'configured' : 'MISSING'}`);
  console.log(`  supabase: ${process.env.SUPABASE_URL ? 'configured' : 'MISSING'}`);
  console.log(`  cors:     ${allowedOrigins.join(', ')}`);
});
