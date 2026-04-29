import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useEffect, useState, useContext } from 'react';
import { useNavigate, Outlet, useLoaderData, type MetaFunction } from 'react-router';
import Footer from '../components/Footer';
import {
  BookOpen,
  Download,
  X,
  Check,
  LogIn,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Code,
  FlaskConical,
  User,
  GraduationCap,
  FileEdit,
  Send,
  Info,
  Search,
} from 'lucide-react';
import { apiUrl, backendUrl, UserDataContext } from '../util/UserData';
import { GhostButton, Pill, PrimaryButton } from '../components/ui/Buttons';
import { cn } from '../util/cn';
import { mergeParentMeta } from '../util/seo';

export interface Standard {
  id: string;
  description: string;
}

export interface LessonMeta {
  files: string[];
  description: string;
  duration?: string;
  lessonPlanDoc?: string;
  solutionDoc?: string;
  standards?: Standard[];
  testCount?: number;
}

export type MetaManifest = Record<string, LessonMeta>;

export interface Classroom {
  id: string;
  name: string;
  studentCount: number;
}

export type ImportDestination =
  | { kind: 'workspace' }
  | { kind: 'draft'; classroomId: string }
  | { kind: 'publish'; classroomId: string };

// eslint-disable-next-line react-refresh/only-export-components
export function destinationKey(dest: ImportDestination): string {
  if (dest.kind === 'workspace') return '_workspace';
  return `${dest.kind}:${dest.classroomId}`;
}

// What the lesson-detail child route reads from useOutletContext.
export interface LessonOutletContext {
  meta: MetaManifest;
  isLoggedIn: boolean | null;
  isTeacher: boolean;
  classrooms: Classroom[];
  loadingClassrooms: boolean;
  importing: boolean;
  importSuccess: string | null;
  ensureClassroomsLoaded: () => void;
  importLesson: (lessonName: string, dest: ImportDestination) => Promise<void>;
}

// Build-time loader: reads meta.json from disk so the prerendered HTML for
// /lessons (and /lessons/:lessonId via the child route) embeds the full
// lesson list. Without this the prerendered shell shows "Loading…" until
// the client fetches it, which costs SEO ranking on the list page.
// eslint-disable-next-line react-refresh/only-export-components
export async function loader() {
  const path = join(process.cwd(), 'public', 'templateProjects', 'meta.json');
  const raw = readFileSync(path, 'utf-8');
  return { meta: JSON.parse(raw) as MetaManifest };
}

// eslint-disable-next-line react-refresh/only-export-components
export const meta: MetaFunction = ({ matches }) => {
  const title = 'Free CSTA-aligned coding lesson plans | CS Room';
  const description =
    'Browse ready-to-use coding lesson plans for grades 9–12. Aligned to CSTA standards. Import to your classroom in one click.';
  return mergeParentMeta(matches, [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ]);
};

// Runtime loader for non-prerendered paths (future community lessons under
// /lessons/:lessonId that aren't in the build-time prerender list).
// eslint-disable-next-line react-refresh/only-export-components
export async function clientLoader() {
  const res = await fetch('/templateProjects/meta.json');
  if (!res.ok) return { meta: {} as MetaManifest };
  return { meta: (await res.json()) as MetaManifest };
}

export default function LessonsPage() {
  const { meta } = useLoaderData() as { meta: MetaManifest };
  const userData = useContext(UserDataContext);
  const navigate = useNavigate();
  const isTeacher = userData?.userInfo?.role === 'teacher';

  const [selectedStandards, setSelectedStandards] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showImportDialog, setShowImportDialog] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [classroomsLoaded, setClassroomsLoaded] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => {
      document.documentElement.style.overflowY = 'hidden';
    };
  }, []);

  useEffect(() => {
    if (userData?.userInfo) {
      setIsLoggedIn(true);
    } else {
      fetch(`${apiUrl}/auth/me`, { credentials: 'include' })
        .then((r) => setIsLoggedIn(r.ok))
        .catch(() => setIsLoggedIn(false));
    }
  }, [userData?.userInfo]);

  const allStandards: Standard[] = [];
  const seenIds = new Set<string>();
  for (const lesson of Object.values(meta)) {
    if (!lesson.lessonPlanDoc) continue;
    for (const s of lesson.standards ?? []) {
      if (!seenIds.has(s.id)) {
        seenIds.add(s.id);
        allStandards.push(s);
      }
    }
  }
  allStandards.sort((a, b) => a.id.localeCompare(b.id));

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const lessonNames = Object.keys(meta).filter((name) => {
    const lesson = meta[name];
    if (!lesson.lessonPlanDoc) return false;
    if (trimmedQuery) {
      const haystack = `${name.replace(/[-_]/g, ' ')} ${lesson.description}`.toLowerCase();
      if (!haystack.includes(trimmedQuery)) return false;
    }
    if (selectedStandards.size === 0) return true;
    const lessonStdIds = new Set((lesson.standards ?? []).map((s) => s.id));
    for (const id of selectedStandards) {
      if (lessonStdIds.has(id)) return true;
    }
    return false;
  });

  const ensureClassroomsLoaded = async () => {
    if (classroomsLoaded || loadingClassrooms) return;
    if (!isLoggedIn) return;
    setLoadingClassrooms(true);
    try {
      const res = await fetch(`${apiUrl}/classrooms/`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        type ApiClassroom = { id: string; name: string; participants?: string[] };
        const toClassroom = (c: ApiClassroom): Classroom => ({
          id: c.id,
          name: c.name,
          studentCount: c.participants?.length ?? 0,
        });
        setClassrooms((data.owner ?? []).map(toClassroom));
      } else {
        setClassrooms([]);
      }
      setClassroomsLoaded(true);
    } catch {
      setClassrooms([]);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  const openImportDialog = (lessonName: string) => {
    setShowImportDialog(lessonName);
    setImportError(null);
    setImportSuccess(null);
    ensureClassroomsLoaded();
  };

  const importLesson = async (lessonName: string, dest: ImportDestination) => {
    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    const lesson = meta[lessonName];
    if (!lesson) return;
    try {
      const formData = new FormData();
      const baseUrl = window.location.origin;
      await Promise.all(
        lesson.files.map(async (filename) => {
          const res = await fetch(`${baseUrl}/templateProjects/${lessonName}/${filename}`);
          if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
          formData.append('files', await res.blob(), `${lessonName}/${filename}`);
        }),
      );

      let endpoint: string;
      if (dest.kind === 'draft') {
        endpoint = `${apiUrl}/classrooms/${dest.classroomId}/drafts`;
      } else if (dest.kind === 'publish') {
        formData.append('classroom_id', dest.classroomId);
        formData.append('move-into', lessonName);
        endpoint = `${apiUrl}/files/upload-folder`;
      } else {
        endpoint = `${apiUrl}/files/upload-folder`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error((await res.text()) || `Upload failed (${res.status})`);
      setImportSuccess(destinationKey(dest));
      if (dest.kind === 'draft' || dest.kind === 'publish') {
        setTimeout(() => navigate(`/classrooms/${dest.classroomId}?tab=assignments`), 600);
      } else {
        setTimeout(() => {
          setShowImportDialog(null);
          setImportSuccess(null);
        }, 1500);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const toggleStandard = (id: string) => {
    setSelectedStandards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const outletContext: LessonOutletContext = {
    meta,
    isLoggedIn,
    isTeacher,
    classrooms,
    loadingClassrooms,
    importing,
    importSuccess,
    ensureClassroomsLoaded,
    importLesson,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-[1200px] mx-auto px-7 py-10 flex-1 w-full">
        <header className="flex flex-col gap-4 mb-10">
          <h1 className="heading-1 m-0">Lessons</h1>
          <p className="body-sm m-0">
            Browse ready-to-use projects and import them into your workspace or classroom.
          </p>
        </header>

        {/* Search + filter */}
        <div className="flex flex-col gap-3 mb-8">
          <div className="relative w-full max-w-[480px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lessons"
              className="bg-paper border border-rule rounded-md pl-9 pr-3.5 py-2 text-ink-default placeholder:text-ink-subtle w-full focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-rule text-sm font-semibold text-ink-strong hover:bg-paper-tinted transition-colors"
            >
              Filter by CSTA standard
              {selectedStandards.size > 0 && (
                <Pill color="navy">{selectedStandards.size}</Pill>
              )}
              {filterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {filterOpen && (() => {
              const categoryNames: Record<string, string> = {
                AP: 'Algorithms & programming',
                CS: 'Computing systems',
                DA: 'Data & analysis',
                IC: 'Impacts of computing',
                NI: 'Networks & the internet',
              };
              const grouped: Record<string, Standard[]> = {};
              for (const s of allStandards) {
                const cat = s.id.replace(/^[^-]+-/, '').replace(/-\d+$/, '');
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(s);
              }
              const sortedCategories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
              return (
                <div className="mt-3 bg-paper-elevated border border-rule-soft rounded-lg p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="eyebrow text-ink-muted">CSTA standards</span>
                    {selectedStandards.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedStandards(new Set())}
                        className="text-xs text-ink-muted hover:text-ink-strong inline-flex items-center gap-1 transition-colors"
                      >
                        <X size={12} />
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    {sortedCategories.map((cat) => (
                      <div key={cat}>
                        <h4 className="eyebrow text-ink-muted mb-2">
                          {categoryNames[cat] || cat}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {grouped[cat].map((s) => {
                            const active = selectedStandards.has(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleStandard(s.id)}
                                className={cn(
                                  'text-left text-xs px-3 py-2 rounded-md border transition-colors',
                                  active
                                    ? 'border-navy bg-navy-soft text-navy'
                                    : 'border-rule-soft text-ink-muted hover:border-rule hover:text-ink-strong',
                                )}
                              >
                                <span className="font-semibold">{s.id}</span>
                                <span className="text-[11px] opacity-80 ml-1.5">{s.description}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Lesson cards */}
        <main>
          {Object.keys(meta).length === 0 ? (
            <div className="text-center py-20 body text-ink-muted">Loading...</div>
          ) : lessonNames.length === 0 ? (
            <div className="bg-paper-elevated border border-rule-soft rounded-xl p-10 text-center body text-ink-muted">
              No lessons match your search and filters.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {lessonNames.map((name) => {
                const lesson = meta[name];
                const displayName = name.replace(/[-_]/g, ' ');
                return (
                  <LessonCard
                    key={name}
                    name={name}
                    displayName={displayName}
                    lesson={lesson}
                    isTeacher={isTeacher}
                    selectedStandards={selectedStandards}
                    onViewPlan={() =>
                      navigate(`/lessons/${name}`, { preventScrollReset: true })
                    }
                    onImport={() => openImportDialog(name)}
                  />
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Footer />

      {/* Lesson plan panel — rendered by the child route via Outlet */}
      <Outlet context={outletContext} />

      {/* Import dialog (triggered by the Import button on a card) */}
      {showImportDialog && (
        <ImportDialog
          lessonName={showImportDialog}
          isLoggedIn={isLoggedIn}
          isTeacher={isTeacher}
          loadingClassrooms={loadingClassrooms}
          classrooms={classrooms}
          importing={importing}
          importSuccess={importSuccess}
          importError={importError}
          onClose={() => {
            setShowImportDialog(null);
            setImportError(null);
            setImportSuccess(null);
          }}
          onImport={(dest) => importLesson(showImportDialog, dest)}
        />
      )}
    </div>
  );
}

function LessonCard({
  name,
  displayName,
  lesson,
  isTeacher,
  selectedStandards,
  onViewPlan,
  onImport,
}: {
  name: string;
  displayName: string;
  lesson: LessonMeta;
  isTeacher: boolean;
  selectedStandards: Set<string>;
  onViewPlan: () => void;
  onImport: () => void;
}) {
  const filterActive = selectedStandards.size > 0;
  return (
    <div
      onClick={onViewPlan}
      className="bg-paper-elevated border border-rule-soft rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 cursor-pointer"
    >
      {/* Title */}
      <h2 className="heading-3">
        {/* Real anchor for crawlers + middle-click + open-in-new-tab. The
            outer div handles SPA navigation for normal clicks. */}
        <a
          href={`/lessons/${name}`}
          onClick={(e) => e.preventDefault()}
          className="text-inherit no-underline"
        >
          {displayName}
        </a>
      </h2>

      {/* Standards */}
      {(lesson.standards ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(lesson.standards ?? []).map((s) => {
            const isSelected = selectedStandards.has(s.id);
            if (filterActive && !isSelected) {
              return (
                <span
                  key={s.id}
                  className="bg-paper-deeper text-ink-subtle px-3 py-[5px] rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  {s.id}
                </span>
              );
            }
            if (filterActive && isSelected) {
              return (
                <span
                  key={s.id}
                  className="bg-ochre text-white px-3 py-[5px] rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  {s.id}
                </span>
              );
            }
            return (
              <Pill key={s.id} color="ochre">
                {s.id}
              </Pill>
            );
          })}
        </div>
      )}

      {/* Description */}
      <p className="body-sm text-ink-muted line-clamp-3">{lesson.description}</p>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-rule-soft text-xs text-ink-subtle">
        <div className="flex items-center gap-3 flex-wrap">
          {lesson.duration && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {lesson.duration}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <FileText size={12} />
            {lesson.files.length} {lesson.files.length === 1 ? 'file' : 'files'}
          </span>
          {(lesson.testCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-forest">
              <FlaskConical size={12} />
              Includes tests
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-between gap-3 pt-3 border-t border-rule-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-5 flex-wrap min-w-0">
          {lesson.lessonPlanDoc && (
            <button
              type="button"
              onClick={onViewPlan}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-strong hover:text-navy transition-colors"
            >
              <BookOpen size={14} />
              View lesson plan
            </button>
          )}
          {isTeacher && lesson.solutionDoc && (
            <a
              href={backendUrl + lesson.solutionDoc}
              download
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-plum hover:underline"
            >
              <Code size={14} />
              Reference solution
            </a>
          )}
        </div>
        <div className="shrink-0">
          <PrimaryButton
            color="navy"
            icon={<Download size={14} />}
            onClick={onImport}
          >
            Import
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function ImportDialog({
  lessonName,
  isLoggedIn,
  isTeacher,
  loadingClassrooms,
  classrooms,
  importing,
  importSuccess,
  importError,
  onClose,
  onImport,
}: {
  lessonName: string;
  isLoggedIn: boolean | null;
  isTeacher: boolean;
  loadingClassrooms: boolean;
  classrooms: Classroom[];
  importing: boolean;
  importSuccess: string | null;
  importError: string | null;
  onClose: () => void;
  onImport: (dest: ImportDestination) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink-strong/60 flex items-center justify-center p-7">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative bg-paper-elevated border border-rule-soft rounded-xl shadow-lg w-full max-w-xl flex flex-col max-h-[90vh]">
        {!isLoggedIn ? (
          <div className="p-7 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="heading-3">Sign in required</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-ink-muted hover:text-ink-strong p-1 rounded hover:bg-paper-tinted transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="body-sm text-ink-muted">
              You need to sign in before importing a lesson.
            </p>
            <a
              href={`${apiUrl}/auth/login`}
              className="bg-navy text-white font-semibold px-5 py-[11px] rounded-md inline-flex items-center justify-center gap-2 shadow-cta hover:brightness-105 transition-[filter] duration-150"
            >
              <LogIn size={16} />
              Continue with Google
            </a>
            <div className="flex justify-end mt-2">
              <GhostButton onClick={onClose}>Cancel</GhostButton>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-7 py-5 border-b border-rule-soft flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="eyebrow text-ink-muted mb-0.5">Import lesson</div>
                <h2 className="heading-3 truncate">
                  &ldquo;{lessonName.replace(/[-_]/g, ' ')}&rdquo;
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-ink-muted hover:text-ink-strong p-1 rounded hover:bg-paper-tinted transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-7 py-5 overflow-y-auto flex flex-col gap-6">
              {importError && (
                <div className="text-sm text-tomato bg-tomato-soft border border-tomato/30 rounded-md p-3">
                  {importError}
                </div>
              )}

              {/* Workspace section */}
              <section>
                <div className="eyebrow text-ink-muted mb-3 inline-flex items-center gap-1.5">
                  <User size={12} />
                  Just me
                </div>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => onImport({ kind: 'workspace' })}
                  className="w-full text-left rounded-lg border border-rule-soft hover:border-navy hover:bg-navy-soft/50 transition-colors p-4 flex items-start gap-3 disabled:opacity-50"
                >
                  <div className="mt-0.5 p-2 rounded-md bg-navy-soft">
                    <User size={18} className="text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-strong">
                        Import to my workspace
                      </span>
                      <Pill color="navy">Private</Pill>
                    </div>
                    <p className="text-xs text-ink-muted mt-1">
                      Adds the lesson files straight to your workspace, alongside your own files. Not linked to any classroom.
                    </p>
                  </div>
                  {importSuccess === destinationKey({ kind: 'workspace' }) && (
                    <Check size={16} className="text-forest mt-3 shrink-0" />
                  )}
                </button>
              </section>

              {/* Classrooms section — teachers only */}
              {isTeacher && (
                <section>
                  <div className="eyebrow text-ink-muted mb-3 inline-flex items-center gap-1.5">
                    <GraduationCap size={12} />
                    Your classrooms
                  </div>

                  {loadingClassrooms ? (
                    <div className="text-center py-6 body-sm text-ink-muted">Loading...</div>
                  ) : classrooms.length === 0 ? (
                    <div className="text-sm text-ink-muted px-3 py-4 rounded-md bg-paper-tinted border border-rule-soft">
                      You aren&rsquo;t a teacher in any classrooms yet.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-2 px-3 py-3 mb-3 rounded-md bg-paper-tinted border border-rule-soft">
                        <Info size={13} className="text-ink-muted mt-0.5 shrink-0" />
                        <p className="text-xs text-ink-muted leading-snug">
                          <span className="text-ochre font-semibold">Draft</span> keeps the lesson private in
                          the classroom&rsquo;s <code className="text-[11px] bg-paper-elevated border border-rule-soft rounded px-1 font-mono">drafts/</code> folder so you can
                          edit before students see it. <span className="text-forest font-semibold">Publish</span>{' '}
                          moves it into <code className="text-[11px] bg-paper-elevated border border-rule-soft rounded px-1 font-mono">assignments/</code> and
                          distributes copies to every current student immediately.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        {classrooms.map((classroom) => (
                          <div
                            key={classroom.id}
                            className="rounded-lg border border-rule-soft bg-paper overflow-hidden"
                          >
                            <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                              <div className="min-w-0">
                                <div className="font-semibold truncate text-ink-strong">{classroom.name}</div>
                                <div className="text-xs text-ink-muted">
                                  {classroom.studentCount} student{classroom.studentCount === 1 ? '' : 's'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  disabled={importing}
                                  onClick={() => onImport({ kind: 'draft', classroomId: classroom.id })}
                                  title="Stage as draft for editing. Not visible to students yet."
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold text-ochre bg-ochre-soft border border-ochre/30 hover:brightness-95 transition-[filter] disabled:opacity-50"
                                >
                                  <FileEdit size={14} />
                                  Save as draft
                                  {importSuccess === destinationKey({ kind: 'draft', classroomId: classroom.id }) && (
                                    <Check size={14} className="text-forest" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={importing}
                                  onClick={() => onImport({ kind: 'publish', classroomId: classroom.id })}
                                  title="Distribute to every current student in this classroom immediately."
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold text-forest bg-forest-soft border border-forest/30 hover:brightness-95 transition-[filter] disabled:opacity-50"
                                >
                                  <Send size={14} />
                                  Publish
                                  {importSuccess === destinationKey({ kind: 'publish', classroomId: classroom.id }) && (
                                    <Check size={14} className="text-forest" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="px-7 py-4 border-t border-rule-soft flex items-center justify-end gap-2">
              <GhostButton onClick={onClose}>Cancel</GhostButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
