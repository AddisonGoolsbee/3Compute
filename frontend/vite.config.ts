import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';

const SITE_URL = 'https://www.csroom.org';

// Public pages that should appear in the sitemap on top of the per-lesson
// URLs. Auth-gated routes (/classrooms, /admin/*, the IDE catchall) and
// throwaway pages (/request-access/thanks, /terms) are intentionally absent.
const STATIC_SITEMAP_PATHS = ['/', '/about', '/lessons', '/request-access', '/demo'];

// Writes build/client/sitemap.xml after the build completes. Vite invokes
// closeBundle once per bundle (client + SSR) — the flag keeps us from
// writing twice.
function sitemapPlugin(): Plugin {
  let written = false;
  return {
    name: 'csroom-sitemap',
    apply: 'build',
    closeBundle() {
      if (written) return;
      written = true;
      const manifestPath = join(process.cwd(), 'public', 'templateProjects', 'meta.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<
        string,
        { lessonPlanDoc?: string }
      >;
      const lessonPaths = Object.entries(manifest)
        .filter(([, lesson]) => Boolean(lesson.lessonPlanDoc))
        .map(([id]) => `/lessons/${id}`);
      const allPaths = [...STATIC_SITEMAP_PATHS, ...lessonPaths];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPaths.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join('\n')}
</urlset>
`;
      writeFileSync(join(process.cwd(), 'build', 'client', 'sitemap.xml'), xml);
    },
  };
}

export default defineConfig({
  plugins: [reactRouter(), tailwindcss(), sitemapPlugin()],
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
