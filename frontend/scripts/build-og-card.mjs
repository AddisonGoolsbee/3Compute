// Renders raster image assets that need text/font rendering:
// - frontend/public/og-card.png — 1200×630 link-preview card (iMessage, Slack,
//   Twitter, Facebook, etc.)
// - frontend/public/apple-touch-icon.png — 180×180 home-screen icon for iOS
//   (and the small chip preview iMessage shows for the link).
//
// Run from frontend/: `node scripts/build-og-card.mjs`
// Re-run any time the design changes; commit the resulting PNGs.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const fontDir = resolve(here, 'fonts');
const publicDir = resolve(here, '..', 'public');

const fontFiles = [
  resolve(fontDir, 'Newsreader.ttf'),
  resolve(fontDir, 'DMSans.ttf'),
];

function renderToPng(svg, outPath, defaultFontFamily = 'Newsreader') {
  const resvg = new Resvg(svg, {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily },
  });
  writeFileSync(outPath, resvg.render().asPng());
  console.log(`wrote ${outPath}`);
}

// Design tokens — kept in sync with .design-system/colors_and_type.css
const PAPER = '#fdfaf2';
const OCHRE_SOFT = '#fbecd0';
const INK_STRONG = '#1a1a1f';
const INK_MUTED = '#6b6a6e';
const NAVY = '#1f4e79';
const TOMATO_PALER = '#f4a48c';
const FOREST_SOFT = '#d6e6dc';

// ---------------------------------------------------------------------------
// og-card.png — 1200×630
// Decorative blobs mirror the hero / mission accent pairs from
// frontend/src/pages/landing.tsx — large soft-cream circles anchored to the
// corners with a tilted square inside.
// ---------------------------------------------------------------------------

const ogCardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
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

renderToPng(ogCardSvg, resolve(publicDir, 'og-card.png'));

// ---------------------------------------------------------------------------
// apple-touch-icon.png — 180×180
// Wraps the existing public/icon.svg with a cream paper background. iOS
// applies its own rounded corners; a solid background keeps the chip preview
// from showing wallpaper through the icon.
// ---------------------------------------------------------------------------

const touchIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <defs>
    <linearGradient id="fold" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#ebe4d2"/>
      <stop offset="1" stop-color="#fbecd0"/>
    </linearGradient>
  </defs>
  <rect width="180" height="180" fill="${PAPER}"/>
  <g transform="scale(4.5)">
    <path d="M6 4 Q4 4 4 6 L4 34 Q4 36 6 36 L26 36 L36 26 L36 6 Q36 4 34 4 Z" fill="${NAVY}"/>
    <path d="M36 26 L26 26 Q26 36 26 36 Z" fill="url(#fold)"/>
    <path d="M26 26 L36 26" stroke="${NAVY}" stroke-width="0.8" stroke-linecap="round" opacity="0.55"/>
    <path d="M26 26 L26 36" stroke="${NAVY}" stroke-width="0.8" stroke-linecap="round" opacity="0.55"/>
    <rect x="9" y="22" width="14" height="1.2" rx="0.6" fill="#e85d3f"/>
    <text x="9" y="20" font-family="Newsreader" font-weight="700" font-size="14" letter-spacing="-0.02em" fill="${PAPER}">CS</text>
  </g>
</svg>`;

renderToPng(touchIconSvg, resolve(publicDir, 'apple-touch-icon.png'));
