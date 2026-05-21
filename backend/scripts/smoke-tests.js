import assert from 'node:assert/strict';
import request from 'supertest';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'smoke-test-service-role';
const { createApp } = await import('../src/server.js');

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    return true;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    return false;
  } finally {
    delete process.env.AVIATIONSTACK_API_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.ALLOWED_ORIGINS;
  }
}

const checks = [
  ['health payload shows provider env as missing', async () => {
    delete process.env.AVIATIONSTACK_API_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.SUPABASE_URL;

    const app = createApp();
    const res = await request(app).get('/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.service, 'connectionrescue-api');
    assert.equal(res.body.aviationstack, false);
    assert.equal(res.body.stripe, false);
    assert.equal(res.body.supabase, false);
    assert.equal(typeof res.body.uptime, 'number');
  }],
  ['health payload shows provider env as configured', async () => {
    process.env.AVIATIONSTACK_API_KEY = 'test-key';
    process.env.STRIPE_SECRET_KEY = 'test-stripe-key';
    process.env.SUPABASE_URL = 'https://example.supabase.co';

    const app = createApp();
    const res = await request(app).get('/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.aviationstack, true);
    assert.equal(res.body.stripe, true);
    assert.equal(res.body.supabase, true);
  }],
  ['CORS blocks disallowed origins', async () => {
    process.env.ALLOWED_ORIGINS = 'https://allowed.example.com';
    const app = createApp();
    let res;
    res = await request(app)
      .get('/health')
      .set('Origin', 'https://blocked.example.com');

    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'cors_not_allowed');
    assert.match(res.body.message, /not allowed/);
    assert.equal(typeof res.body.requestId, 'string');
  }],
  ['unknown routes return structured 404', async () => {
    const app = createApp();
    const res = await request(app).get('/does-not-exist');

    assert.equal(res.status, 404);
    assert.deepEqual(res.body, {
      error: 'not_found',
      path: '/does-not-exist',
    });
  }],
];

let failed = 0;
for (const [name, fn] of checks) {
  const ok = await runTest(name, fn);
  if (!ok) failed += 1;
}

if (failed > 0) {
  console.error(`\n${failed} smoke test(s) failed.`);
  process.exit(1);
}

console.log('\nAll smoke tests passed.');
