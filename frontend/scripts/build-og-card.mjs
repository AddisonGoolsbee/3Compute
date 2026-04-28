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

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="fold" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ebe4d2"/>
      <stop offset="1" stop-color="#fbecd0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="#fdfaf2"/>

  <!-- Faint horizontal ruled lines: paper texture, low opacity so they sit behind text -->
  <g stroke="#e8e1ce" stroke-width="1" opacity="0.55">
    <line x1="0" y1="90"  x2="1200" y2="90"/>
    <line x1="0" y1="150" x2="1200" y2="150"/>
    <line x1="0" y1="210" x2="1200" y2="210"/>
    <line x1="0" y1="540" x2="1200" y2="540"/>
    <line x1="0" y1="580" x2="1200" y2="580"/>
  </g>

  <!-- Folder/CS glyph, scaled 3.5x from the 40px icon (=140px), centered horizontally -->
  <g transform="translate(530, 80) scale(3.5)">
    <path d="M6 4 Q4 4 4 6 L4 34 Q4 36 6 36 L26 36 L36 26 L36 6 Q36 4 34 4 Z" fill="#1f4e79"/>
    <path d="M36 26 L26 26 Q26 36 26 36 Z" fill="url(#fold)"/>
    <path d="M26 26 L36 26" stroke="#1f4e79" stroke-width="0.8" stroke-linecap="round" opacity="0.55"/>
    <path d="M26 26 L26 36" stroke="#1f4e79" stroke-width="0.8" stroke-linecap="round" opacity="0.55"/>
    <rect x="9" y="22" width="14" height="1.2" rx="0.6" fill="#e85d3f"/>
    <text x="9" y="20" font-family="Newsreader" font-weight="700" font-size="14" letter-spacing="-0.02em" fill="#fdfaf2">CS</text>
  </g>

  <!-- Hero tagline: two lines, Newsreader semibold -->
  <text x="600" y="370" font-family="Newsreader" font-weight="600" font-size="68" letter-spacing="-0.018em" fill="#1a1a1f" text-anchor="middle">The coding classroom</text>
  <text x="600" y="450" font-family="Newsreader" font-weight="600" font-size="68" letter-spacing="-0.018em" fill="#1a1a1f" text-anchor="middle">that stays with students</text>

  <!-- Navy accent rule under the tagline -->
  <rect x="560" y="488" width="80" height="3" rx="1.5" fill="#1f4e79"/>

  <!-- Domain mark -->
  <text x="600" y="560" font-family="DM Sans" font-weight="500" font-size="22" letter-spacing="0.06em" fill="#6b6a6e" text-anchor="middle">csroom.org</text>
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
