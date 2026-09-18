/**
 * Phase 1 smoke tests — health + consistent error shape.
 * Usage: node scripts/smoke-phase1.js
 */
const BASE = process.env.API_URL || 'http://localhost:5000';

/**
 * @param {string} name
 * @param {boolean} ok
 * @param {string} [detail]
 */
function assert(name, ok, detail = '') {
  if (!ok) {
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log(`\nPhase 1 smoke @ ${BASE}\n`);

  const healthRes = await fetch(`${BASE}/api/health`);
  const health = await healthRes.json();
  assert('GET /api/health status 200', healthRes.status === 200);
  assert(
    'GET /api/health success shape',
    health.success === true && health.data?.service === 'feature-roadmap-api'
  );

  const missingRes = await fetch(`${BASE}/api/does-not-exist`);
  const missing = await missingRes.json();
  assert('Unknown route 404', missingRes.status === 404);
  assert(
    'Unknown route error shape',
    missing.success === false && typeof missing.message === 'string'
  );

  if (process.exitCode) {
    console.log('\nSmoke tests FAILED\n');
    process.exit(1);
  }
  console.log('\nSmoke tests PASSED\n');
}

main().catch((err) => {
  console.error('Smoke runner error:', err.message || err);
  process.exit(1);
});
