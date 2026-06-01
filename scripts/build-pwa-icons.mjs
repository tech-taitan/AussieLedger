/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 13 PWA-01 — deterministic PWA icon-rendering pipeline.
 *
 * Renders the lucide-react Calculator icon to 5 PNGs in public/:
 *   - icon-192.png             (192×192, transparent bg, full-size icon)
 *   - icon-512.png             (512×512, transparent bg, full-size icon)
 *   - icon-192-maskable.png    (192×192, white bg, icon at 60% center — 20% W3C safe-zone)
 *   - icon-512-maskable.png    (512×512, white bg, icon at 60% center — 20% W3C safe-zone)
 *   - apple-touch-icon.png     (180×180, white bg — iOS requires opaque)
 *
 * Calculator SVG path data is hardcoded (NOT imported from lucide-react at
 * runtime) so this build-only script has zero React-package dependency.
 *
 * Idempotent: re-running produces byte-identical outputs (same SVG → same
 * resvg WASM render → same PNG bytes). Run via `npm run build:icons` only
 * when icon design changes; the PNGs are committed to git and CI does NOT
 * regenerate on every build.
 */
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Calculator icon primitives — extracted verbatim from lucide-react@0.546.0:
//   rect width=16 height=20 x=4 y=2 rx=2  (the calculator body)
//   line x1=8 x2=16 y1=6 y2=6              (the display top edge)
//   line x1=16 x2=16 y1=14 y2=18           (the segment-display right edge)
//   path d="M16 10h.01" / "M12 10h.01" / "M8 10h.01"  (row 1 buttons)
//   path d="M12 14h.01" / "M8 14h.01"                  (row 2 buttons)
//   path d="M12 18h.01" / "M8 18h.01"                  (row 3 buttons)
// All rendered with stroke-width=2 stroke-linecap=round stroke-linejoin=round fill=none.
const CALCULATOR_PRIMITIVES = `
  <rect width="16" height="20" x="4" y="2" rx="2" />
  <line x1="8" x2="16" y1="6" y2="6" />
  <line x1="16" x2="16" y1="14" y2="18" />
  <path d="M16 10h.01" />
  <path d="M12 10h.01" />
  <path d="M8 10h.01" />
  <path d="M12 14h.01" />
  <path d="M8 14h.01" />
  <path d="M12 18h.01" />
  <path d="M8 18h.01" />
`;

/**
 * Compose a complete SVG document containing the Calculator icon.
 *
 * @param {Object} opts
 * @param {number} opts.padding   - SVG-units of padding around the icon (0 = full bleed; 4.8 = 20% safe-zone on a 24-unit canvas).
 * @param {string} opts.bgColor   - Background fill, or 'transparent' to omit the background rect.
 * @param {string} opts.strokeColor - Stroke color for the icon primitives.
 * @returns {string} An SVG document string with viewBox="0 0 24 24".
 */
function buildSvg({ padding, bgColor, strokeColor }) {
  // viewBox is fixed at 24×24 (matches lucide's coordinate space). We scale the
  // icon inside via a <g transform>: scale=(24-2p)/24, translate=p,p.
  const scale = (24 - 2 * padding) / 24;
  const bg = bgColor === 'transparent'
    ? ''
    : `<rect width="24" height="24" fill="${bgColor}" />`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  ${bg}
  <g transform="translate(${padding} ${padding}) scale(${scale})"
     stroke="${strokeColor}" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${CALCULATOR_PRIMITIVES.trim()}
  </g>
</svg>`;
}

/**
 * Render an SVG string to a PNG buffer at the requested width.
 *
 * @param {Object} opts
 * @param {string} opts.svg     - Source SVG document.
 * @param {number} opts.sizePx  - Output width AND height in pixels.
 * @returns {Buffer} PNG bytes.
 */
function render({ svg, sizePx }) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: sizePx },
    background: 'rgba(0,0,0,0)', // transparent canvas; SVG bg-rect handles opacity
  });
  return resvg.render().asPng();
}

// ---- main flow ----

mkdirSync('public', { recursive: true });

const BLUE = '#3b82f6';   // Tailwind blue-500; matches Sidebar.tsx Calculator color
const WHITE = '#ffffff';

// Standard 192/512 — transparent bg, full-size icon (purpose: any)
const stdSvg = buildSvg({ padding: 0, bgColor: 'transparent', strokeColor: BLUE });
writeFileSync(join('public', 'icon-192.png'), render({ svg: stdSvg, sizePx: 192 }));
writeFileSync(join('public', 'icon-512.png'), render({ svg: stdSvg, sizePx: 512 }));

// Maskable 192/512 — white bg, icon at 60% center (20% W3C safe-zone padding all sides)
// padding = 4.8 SVG units (20% of 24) → scale 0.6 → icon occupies central 60% × 60%
const maskSvg = buildSvg({ padding: 4.8, bgColor: WHITE, strokeColor: BLUE });
writeFileSync(join('public', 'icon-192-maskable.png'), render({ svg: maskSvg, sizePx: 192 }));
writeFileSync(join('public', 'icon-512-maskable.png'), render({ svg: maskSvg, sizePx: 512 }));

// Apple-touch 180×180 — white bg (iOS requires opaque; transparent renders as black on Home Screen)
const appleSvg = buildSvg({ padding: 0, bgColor: WHITE, strokeColor: BLUE });
writeFileSync(join('public', 'apple-touch-icon.png'), render({ svg: appleSvg, sizePx: 180 }));

console.log('build-pwa-icons: OK — wrote 5 PNGs to public/');
