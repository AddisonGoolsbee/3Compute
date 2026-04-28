// Renders the Open Graph link-preview card (1200×630) used for iMessage,
// Slack, Twitter, etc. into frontend/public/og-card.png.
//
// Run from frontend/: `node scripts/build-og-card.mjs`
// Re-run any time the design or copy changes; commit the resulting PNG.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, 'fonts');
const outPath = resolve(here, '..', 'public', 'og-card.png');

// Design tokens — kept in sync with .design-system/colors_and_type.css
const PAPER = '#fdfaf2';
const OCHRE_SOFT = '#fbecd0';
const INK_STRONG = '#1a1a1f';
const INK_MUTED = '#6b6a6e';
const NAVY = '#1f4e79';
const TOMATO = '#e85d3f';
const TOMATO_PALER = '#f4a48c';
const OCHRE = '#e09733';
const FOREST_SOFT = '#d6e6dc';

// Decorative blobs mirror the hero / mission accent pairs from
// frontend/src/pages/landing.tsx — large soft-cream circles anchored to the
// corners with a saturated tilted square inside.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="${PAPER}"/>

  <!-- Top-right: soft cream circle (partially off-canvas) with a paler tomato tilted square pulled toward the circle's center -->
  <circle cx="1110" cy="10" r="240" fill="${OCHRE_SOFT}" opacity="0.85"/>
  <g transform="rotate(14 1025 105)">
    <rect x="955" y="35" width="140" height="140" rx="26" fill="${TOMATO_PALER}" opacity="0.95"/>
  </g>

  <!-- Bottom-left: pale forest tilted square (partially off-canvas), nudged right of the top circle's mirror -->
  <g transform="rotate(-6 150 710)">
    <rect x="-20" y="540" width="340" height="340" rx="28" fill="${FOREST_SOFT}" opacity="0.95"/>
  </g>

  <!-- Centered tagline -->
  <text x="600" y="255" font-family="Newsreader" font-weight="600" font-size="86" letter-spacing="-0.018em" fill="${INK_STRONG}" text-anchor="middle">The coding classroom</text>
  <text x="600" y="358" font-family="Newsreader" font-weight="600" font-size="86" letter-spacing="-0.018em" fill="${INK_STRONG}" text-anchor="middle">that stays with students</text>

  <!-- Navy accent rule -->
  <rect x="560" y="396" width="80" height="3" rx="1.5" fill="${NAVY}"/>

  <!-- Domain mark -->
  <text x="600" y="442" font-family="DM Sans" font-weight="500" font-size="24" letter-spacing="0.06em" fill="${INK_MUTED}" text-anchor="middle">csroom.org</text>
</svg>`;

const resvg = new Resvg(svg, {
  font: {
    fontFiles: [
      resolve(fontDir, 'Newsreader.ttf'),
      resolve(fontDir, 'DMSans.ttf'),
    ],
    loadSystemFonts: false,
    defaultFontFamily: 'Newsreader',
  },
});
writeFileSync(outPath, resvg.render().asPng());

console.log(`wrote ${outPath}`);
