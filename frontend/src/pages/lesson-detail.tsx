import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useOutletContext, useLoaderData } from 'react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  X,
  Check,
  Download,
  ChevronDown,
  Printer,
  User,
  FileEdit,
  Send,
} from 'lucide-react';
import type { LoaderFunctionArgs, ClientLoaderFunctionArgs, MetaFunction } from 'react-router';
import { GhostButton, PrimaryButton } from '../components/ui/Buttons';
import { printMarkdownElement } from '../util/printMarkdown';
import { mergeParentMeta } from '../util/seo';
import {
  destinationKey,
  type ImportDestination,
  type LessonMeta,
  type LessonOutletContext,
  type MetaManifest,
} from './lessons';

interface LessonDetailLoaderData {
  lessonId: string;
  lesson: LessonMeta | null;
  markdown: string | null;
  // Echoed back so meta() doesn't have to re-read meta.json. Only set on the
  // build-time loader (where it's already on disk); the client loader leaves
  // it null because the parent route already has it.
  manifestForMeta: MetaManifest | null;
}

// Build-time loader: reads the lesson plan markdown from disk so the
// prerendered HTML for /lessons/:lessonId embeds the lesson body. This is
// what gives the page real SEO weight (title + description + body content
// in the initial HTML response, no JS required).
// eslint-disable-next-line react-refresh/only-export-components
export async function loader({ params }: LoaderFunctionArgs) {
  const lessonId = params.lessonId ?? '';
  const publicDir = join(process.cwd(), 'public');
  const manifestPath = join(publicDir, 'templateProjects', 'meta.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as MetaManifest;
  const lesson = manifest[lessonId] ?? null;

  let markdown: string | null = null;
  if (lesson?.lessonPlanDoc) {
    // lessonPlanDoc is a public-relative URL like "/docs/foo/lesson-plan.md".
    // Strip the leading slash before joining so the result stays under publicDir.
    const rel = lesson.lessonPlanDoc.replace(/^\/+/, '');
    try {
      markdown = readFileSync(join(publicDir, rel), 'utf-8');
    } catch {
      markdown = null;
    }
  }

  return {
    lessonId,
    lesson,
    markdown,
    manifestForMeta: manifest,
  } satisfies LessonDetailLoaderData;
}

// Runtime loader: covers two cases the build-time loader can't —
// (1) navigation in dev mode where prerender hasn't run, and
// (2) future community lessons whose IDs aren't in the prerender list.
// eslint-disable-next-line react-refresh/only-export-components
export async function clientLoader({ params }: ClientLoaderFunctionArgs) {
  const lessonId = params.lessonId ?? '';
  let manifest: MetaManifest = {};
  try {
    const r = await fetch('/templateProjects/meta.json');
    if (r.ok) manifest = await r.json();
  } catch {
    // ignore — lesson will render as not-found
  }
  const lesson = manifest[lessonId] ?? null;

  let markdown: string | null = null;
  if (lesson?.lessonPlanDoc) {
    try {
      const r = await fetch(lesson.lessonPlanDoc);
      const text = r.ok ? await r.text() : '';
      // SPA fallback returns index.html for unknown paths with status 200,
      // so reject anything that smells like an HTML document.
      const looksLikeHtml = /^\s*<!doctype html|^\s*<html\b/i.test(text);
      markdown = looksLikeHtml ? null : text;
    } catch {
      markdown = null;
    }
  }

  return {
    lessonId,
    lesson,
    markdown,
    manifestForMeta: null,
  } satisfies LessonDetailLoaderData;
}

// eslint-disable-next-line react-refresh/only-export-components
export const meta: MetaFunction<typeof loader> = ({ data, params, matches }) => {
  const lessonId = params.lessonId ?? '';
  const lesson = data?.lesson;
  const displayName = (lesson && lessonId ? lessonId : '').replace(/[-_]/g, ' ');

  if (!lesson) {
    return mergeParentMeta(matches, [
      { title: 'Lesson not found | CS Room' },
      { name: 'description', content: 'The lesson you tried to open is no longer available.' },
      { name: 'robots', content: 'noindex' },
    ]);
  }

  const title = `${displayName} | CS Room lesson`;
  const description = lesson.description;
  const url = `https://www.csroom.org/lessons/${lessonId}`;
  return mergeParentMeta(matches, [
    { title },
    { name: 'description', content: description },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { tagName: 'link', rel: 'canonical', href: url },
  ]);
};

export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = params.lessonId ?? '';
  const navigate = useNavigate();
  const data = useLoaderData() as LessonDetailLoaderData;
  const ctx = useOutletContext<LessonOutletContext>();
  const { isLoggedIn, isTeacher, ensureClassroomsLoaded } = ctx;
  const markdownRef = useRef<HTMLDivElement>(null);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Prefetch the teacher's classroom list as soon as the panel opens, so the
  // import menu has data ready by the time the user clicks Import.
  useEffect(() => {
    if (isLoggedIn && isTeacher) ensureClassroomsLoaded();
  }, [isLoggedIn, isTeacher, ensureClassroomsLoaded]);

  useEffect(() => {
    if (!importMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setImportMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [importMenuOpen]);

  const close = () => navigate('/lessons', { preventScrollReset: true });

  const handleImportClick = () => {
    if (!ctx.isLoggedIn) {
      // Fall back to the parent's full sign-in dialog. Closing the panel
      // routes back to /lessons, where the parent renders the dialog.
      // We can't trigger the dialog from here cleanly without expanding the
      // outlet contract, so we just navigate back; the user clicks Import
      // on the card to get the sign-in flow. This is an acceptable
      // edge case: the panel's import button mostly matters once logged in.
      close();
      return;
    }
    setImportMenuOpen((v) => !v);
  };

  const onImport = (dest: ImportDestination) => {
    setImportMenuOpen(false);
    ctx.importLesson(lessonId, dest);
  };

  const displayName = lessonId.replace(/[-_]/g, ' ');
  const notFound = !data.lesson;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-ink-strong/60"
        onClick={close}
      />
      <div className="relative ml-auto w-full max-w-3xl bg-paper-elevated border-l border-rule-soft flex flex-col h-full overflow-hidden shadow-lg slide-in-right">
        <div className="px-7 py-4 border-b border-rule-soft flex items-center justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <div className="eyebrow text-ink-muted mb-0.5">Lesson plan</div>
            <div className="heading-3 truncate">{displayName}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!notFound && (
              <GhostButton
                icon={<Printer size={14} />}
                onClick={() => {
                  if (markdownRef.current) {
                    printMarkdownElement(markdownRef.current, displayName);
                  }
                }}
              >
                Print
              </GhostButton>
            )}
            {!notFound && (
              <div className="relative" ref={menuRef}>
                <PrimaryButton
                  color="navy"
                  onClick={handleImportClick}
                  icon={<Download size={14} />}
                >
                  Import
                  <ChevronDown size={14} />
                </PrimaryButton>
                {importMenuOpen && ctx.isLoggedIn && (
                  <div className="absolute right-0 top-full mt-2 w-[300px] bg-paper-elevated border border-rule-soft rounded-lg shadow-md z-10 overflow-hidden">
                    <button
                      type="button"
                      disabled={ctx.importing}
                      onClick={() => onImport({ kind: 'workspace' })}
                      className="w-full text-left px-4 py-3 hover:bg-paper-tinted transition-colors flex items-start gap-2.5 disabled:opacity-50"
                    >
                      <User size={16} className="mt-0.5 text-navy shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink-strong">
                          Import to my workspace
                        </div>
                        <div className="text-xs text-ink-muted">
                          Private to you. Not linked to any classroom.
                        </div>
                      </div>
                      {ctx.importSuccess === '_workspace' && (
                        <Check size={14} className="text-forest mt-1 shrink-0" />
                      )}
                    </button>
                    {ctx.isTeacher && ctx.classrooms.length > 0 && (
                      <div className="border-t border-rule-soft">
                        <div className="eyebrow text-ink-muted px-4 pt-3 pb-1">
                          Your classrooms
                        </div>
                        {ctx.classrooms.map((classroom) => (
                          <div
                            key={classroom.id}
                            className="px-4 py-2 hover:bg-paper-tinted transition-colors"
                          >
                            <div className="text-sm font-semibold text-ink-strong truncate">
                              {classroom.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                type="button"
                                disabled={ctx.importing}
                                onClick={() =>
                                  onImport({ kind: 'draft', classroomId: classroom.id })
                                }
                                className="inline-flex items-center gap-1 text-xs font-semibold text-ochre bg-ochre-soft px-2 py-1 rounded-md hover:brightness-95 transition-[filter] disabled:opacity-50"
                              >
                                <FileEdit size={12} />
                                Save as draft
                                {ctx.importSuccess ===
                                  destinationKey({ kind: 'draft', classroomId: classroom.id }) && (
                                  <Check size={12} className="text-forest" />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={ctx.importing}
                                onClick={() =>
                                  onImport({ kind: 'publish', classroomId: classroom.id })
                                }
                                className="inline-flex items-center gap-1 text-xs font-semibold text-forest bg-forest-soft px-2 py-1 rounded-md hover:brightness-95 transition-[filter] disabled:opacity-50"
                              >
                                <Send size={12} />
                                Publish
                                {ctx.importSuccess ===
                                  destinationKey({ kind: 'publish', classroomId: classroom.id }) && (
                                  <Check size={12} className="text-forest" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {ctx.isTeacher && !ctx.loadingClassrooms && ctx.classrooms.length === 0 && (
                      <div className="border-t border-rule-soft px-4 py-3 text-xs text-ink-muted">
                        You aren't a teacher in any classrooms yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="p-2 rounded-md hover:bg-paper-tinted text-ink-muted hover:text-ink-strong transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-7">
          {notFound ? (
            <div className="text-center body text-ink-muted py-12">
              That lesson isn&rsquo;t available.
            </div>
          ) : data.markdown ? (
            <div className="markdown-content" ref={markdownRef}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.markdown}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center body text-ink-muted py-12">
              Failed to load lesson plan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
