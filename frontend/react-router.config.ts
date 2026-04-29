import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Config } from '@react-router/dev/config';

export default {
  appDirectory: 'src',
  ssr: false,
  // Prerender the lessons index and one static page per curated lesson.
  // Each prerendered URL ends up as a real HTML file with the lesson title,
  // description, and body baked in (see loaders in pages/lessons.tsx and
  // pages/lesson-detail.tsx). Future community lessons stored in the DB
  // won't be in this list — they fall through to the SPA's clientLoader at
  // runtime, which is fine; SEO for those is intentionally a follow-up.
  async prerender() {
    const manifestPath = join(process.cwd(), 'public', 'templateProjects', 'meta.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<
      string,
      { lessonPlanDoc?: string }
    >;
    const lessonPaths = Object.entries(manifest)
      .filter(([, lesson]) => Boolean(lesson.lessonPlanDoc))
      .map(([id]) => `/lessons/${id}`);
    return ['/', '/about', '/lessons', ...lessonPaths];
  },
} satisfies Config;
