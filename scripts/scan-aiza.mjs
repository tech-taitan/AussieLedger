/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Post-build secret-leak guard: greps dist/ for the Gemini API key shape
 * (AIza followed by 35 chars from [0-9A-Za-z_-]). Defends against the
 * VITE_GEMINI_API_KEY env-leak CVE analog (Truffle Security 2025: 2,863
 * live keys exposed via VITE_ env vars baked into production bundles).
 *
 * Runs as part of `npm run build` so the gate fires in BOTH GitHub Actions
 * CI AND on Vercel's build runner — neither can ship a bundle that contains
 * a Gemini-key-shape string without exiting non-zero first.
 *
 * Exits 0 if dist/ is clean.
 * Exits 1 (and prints offending file + line) if any match is found.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REGEX = /AIza[0-9A-Za-z_-]{35}/;
const DIST = 'dist';

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const hits = [];
try {
  for (const file of walk(DIST)) {
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    text.split('\n').forEach((line, i) => {
      const m = line.match(REGEX);
      if (m) hits.push({ file, line: i + 1, match: m[0] });
    });
  }
} catch (e) {
  if (e.code === 'ENOENT') {
    console.error(`scan-aiza: ${DIST}/ does not exist; run \`vite build\` first`);
    process.exit(1);
  }
  throw e;
}

if (hits.length > 0) {
  console.error('scan-aiza: FAIL — Gemini-key-shape strings found in dist/:');
  for (const h of hits) console.error(`  ${h.file}:${h.line}  ${h.match}`);
  console.error('\nThis is almost certainly an accidental VITE_GEMINI_API_KEY leak.');
  console.error('Check .env files and vite.config.ts. Never use a VITE_ prefix for secrets.');
  process.exit(1);
}

console.log('scan-aiza: OK — no Gemini key shapes in dist/');
