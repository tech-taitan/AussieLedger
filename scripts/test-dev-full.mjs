/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integration smoke for `npm run dev:full`:
 *   1. Spawn `npm run dev:full`
 *   2. Poll http://localhost:4000/api/health for up to 30s
 *   3. Assert response is { ok: true, version: 2, aiEnabled: <bool> }
 *   4. Kill the spawned process tree (concurrently -k handles children)
 *
 * Exits 0 on success, 1 on failure.
 * Plan 03-4 wires the dev:full script and the server into a passing state.
 * Wave 0 ships this script as the integration-test entry point.
 */
import { spawn } from 'node:child_process';
import process from 'node:process';

const PROBE_URL = 'http://localhost:4000/api/health';
const TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

async function pollHealth() {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    try {
      const res = await fetch(PROBE_URL);
      if (res.ok) {
        const body = await res.json();
        if (body && body.ok === true && typeof body.version === 'number' && typeof body.aiEnabled === 'boolean') {
          return body;
        }
      }
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Health probe timed out after ${TIMEOUT_MS}ms`);
}

const child = spawn('npm', ['run', 'dev:full'], {
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: process.platform === 'win32',
  detached: false,
});

let exitCode = 1;
try {
  const health = await pollHealth();
  console.log('[test-dev-full] /api/health responded:', JSON.stringify(health));
  exitCode = 0;
} catch (err) {
  console.error('[test-dev-full] FAIL:', err && err.message ? err.message : err);
  exitCode = 1;
} finally {
  // concurrently -k kills its child processes when the parent dies
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/f', '/t']);
    } else {
      child.kill('SIGTERM');
    }
  } catch {}
  process.exit(exitCode);
}
