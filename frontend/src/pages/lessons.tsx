import { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router';
import Footer from '../components/Footer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  Printer,
  FlaskConical,
  User,
  GraduationCap,
  FileEdit,
  Send,
  Info,
  Search,
} from 'lucide-react';
import { apiUrl, backendUrl, UserDataContext } from '../util/UserData';
import { printMarkdownElement } from '../util/printMarkdown';
import { GhostButton, Pill, PrimaryButton } from '../components/ui/Buttons';
import { cn } from '../util/cn';

interface Standard {
  id: string;
  description: string;
}

interface LessonMeta {
  files: string[];
  description: string;
  duration?: string;
  lessonPlanDoc?: string;
  solutionDoc?: string;
  standards?: Standard[];
  testCount?: number;
}

type MetaManifest = Record<string, LessonMeta>;

interface Classroom {
  id: string;
  name: string;
  studentCount: number;
}

type ImportDestination =
  | { kind: 'workspace' }
  | { kind: 'draft'; classroomId: string }
  | { kind: 'publish'; classroomId: string };

function destinationKey(dest: ImportDestination): string {
  if (dest.kind === 'workspace') return '_workspace';
  return `${dest.kind}:${dest.classroomId}`;
}

export default function LessonsPage() {
  const userData = useContext(UserDataContext);
  const navigate = useNavigate();
  const isTeacher = userData?.userInfo?.role === 'teacher';
  const [meta, setMeta] = useState<MetaManifest>({});
  const [selectedStandards, setSelectedStandards] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeLessonPlan, setActiveLessonPlan] = useState<string | null>(null);
  const [lessonPlanContent, setLessonPlanContent] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(false);
  const lessonPlanRef = useRef<HTMLDivElement>(null);

  const [showImportDialog, setShowImportDialog] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => {
      document.documentElement.style.overflowY = 'hidden';
    };
  }, []);

  useEffect(() => {
    fetch('/templateProjects/meta.json')
      .then((r) => r.json())
      .then((data: MetaManifest) => setMeta(data))
      .catch((err) => console.error('Failed to load lesson metadata', err));
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

  const openLessonPlan = async (name: string) => {
    const lesson = meta[name];
    if (!lesson.lessonPlanDoc) return;
    setActiveLessonPlan(name);
    setLoadingPlan(true);
    try {
      const res = await fetch(lesson.lessonPlanDoc);
      // SPA fallback returns the index HTML for unknown paths with status
      // 200, so the .ok check isn't enough — also reject anything that
      // looks like an HTML document.
      const text = res.ok ? await res.text() : '';
      const looksLikeHtml = /^\s*<!doctype html|^\s*<html\b/i.test(text);
      if (!res.ok || looksLikeHtml) {
        setLessonPlanContent('Failed to load lesson plan.');
      } else {
        setLessonPlanContent(text);
      }
    } catch {
      setLessonPlanContent('Failed to load lesson plan.');
    } finally {
      setLoadingPlan(false);
    }
  };

  const openImportDialog = async (lessonName: string) => {
    setShowImportDialog(lessonName);
    if (!isLoggedIn) return;
    setLoadingClassrooms(true);
    setImportError(null);
    setImportSuccess(null);
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
        // Only classrooms the user owns (is instructor of) — draft/publish
        // require instructor privileges.
        setClassrooms((data.owner ?? []).map(toClassroom));
      } else {
        setClassrooms([]);
      }
    } catch {
      setClassrooms([]);
    } finally {
      setLoadingClassrooms(false);
    }
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
      // When the teacher imported into a classroom, jump to that classroom's
      // page so they can see the new draft / published assignment right away.
      // Workspace imports stay on the lessons page.
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
                    displayName={displayName}
                    lesson={lesson}
                    isTeacher={isTeacher}
                    selectedStandards={selectedStandards}
                    onViewPlan={() => openLessonPlan(name)}
                    onImport={() => openImportDialog(name)}
                  />
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Footer />

      {/* Lesson plan viewer overlay */}
      {activeLessonPlan && (
        <LessonPlanPanel
          lessonName={activeLessonPlan}
          loading={loadingPlan}
          content={lessonPlanContent}
          markdownRef={lessonPlanRef}
          isLoggedIn={!!isLoggedIn}
          isTeacher={isTeacher}
          classrooms={classrooms}
          loadingClassrooms={loadingClassrooms}
          importing={importing}
          importSuccess={importSuccess}
          onClose={() => setActiveLessonPlan(null)}
          onPrint={() => {
            if (lessonPlanRef.current) {
              printMarkdownElement(
                lessonPlanRef.current,
                activeLessonPlan.replace(/[-_]/g, ' '),
              );
            }
          }}
          onOpenImportDialog={() => openImportDialog(activeLessonPlan)}
          onImport={(dest) => importLesson(activeLessonPlan, dest)}
        />
      )}

      {/* Import dialog */}
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
  displayName,
  lesson,
  isTeacher,
  selectedStandards,
  onViewPlan,
  onImport,
}: {
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
      <h2 className="heading-3">{displayName}</h2>

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

function LessonPlanPanel({
  lessonName,
  loading,
  content,
  markdownRef,
  isLoggedIn,
  isTeacher,
  classrooms,
  loadingClassrooms,
  importing,
  importSuccess,
  onClose,
  onPrint,
  onOpenImportDialog,
  onImport,
}: {
  lessonName: string;
  loading: boolean;
  content: string;
  markdownRef: React.RefObject<HTMLDivElement | null>;
  isLoggedIn: boolean;
  isTeacher: boolean;
  classrooms: Classroom[];
  loadingClassrooms: boolean;
  importing: boolean;
  importSuccess: string | null;
  onClose: () => void;
  onPrint: () => void;
  onOpenImportDialog: () => void;
  onImport: (dest: ImportDestination) => void;
}) {
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleImportClick = () => {
    if (!isLoggedIn) {
      onOpenImportDialog();
      return;
    }
    setImportMenuOpen((v) => !v);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-ink-strong/60"
        onClick={onClose}
      />
      <div className="relative ml-auto w-full max-w-3xl bg-paper-elevated border-l border-rule-soft flex flex-col h-full overflow-hidden shadow-lg slide-in-right">
        <div className="px-7 py-4 border-b border-rule-soft flex items-center justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <div className="eyebrow text-ink-muted mb-0.5">Lesson plan</div>
            <div className="heading-3 truncate">{lessonName.replace(/[-_]/g, ' ')}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <GhostButton icon={<Printer size={14} />} onClick={onPrint}>
              Print
            </GhostButton>
            <div className="relative" ref={menuRef}>
              <PrimaryButton
                color="navy"
                onClick={handleImportClick}
                icon={<Download size={14} />}
              >
                Import
                <ChevronDown size={14} />
              </PrimaryButton>
              {importMenuOpen && isLoggedIn && (
                <div className="absolute right-0 top-full mt-2 w-[300px] bg-paper-elevated border border-rule-soft rounded-lg shadow-md z-10 overflow-hidden">
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => {
                      setImportMenuOpen(false);
                      onImport({ kind: 'workspace' });
                    }}
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
                    {importSuccess === '_workspace' && (
                      <Check size={14} className="text-forest mt-1 shrink-0" />
                    )}
                  </button>
                  {isTeacher && classrooms.length > 0 && (
                    <div className="border-t border-rule-soft">
                      <div className="eyebrow text-ink-muted px-4 pt-3 pb-1">
                        Your classrooms
                      </div>
                      {classrooms.map((classroom) => (
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
                              disabled={importing}
                              onClick={() => {
                                setImportMenuOpen(false);
                                onImport({ kind: 'draft', classroomId: classroom.id });
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-ochre bg-ochre-soft px-2 py-1 rounded-md hover:brightness-95 transition-[filter] disabled:opacity-50"
                            >
                              <FileEdit size={12} />
                              Save as draft
                            </button>
                            <button
                              type="button"
                              disabled={importing}
                              onClick={() => {
                                setImportMenuOpen(false);
                                onImport({ kind: 'publish', classroomId: classroom.id });
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-forest bg-forest-soft px-2 py-1 rounded-md hover:brightness-95 transition-[filter] disabled:opacity-50"
                            >
                              <Send size={12} />
                              Publish
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {isTeacher && !loadingClassrooms && classrooms.length === 0 && (
                    <div className="border-t border-rule-soft px-4 py-3 text-xs text-ink-muted">
                      You aren't a teacher in any classrooms yet.
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-md hover:bg-paper-tinted text-ink-muted hover:text-ink-strong transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-7">
          {loading ? (
            <div className="text-center body text-ink-muted py-12">Loading...</div>
          ) : (
            <div className="markdown-content" ref={markdownRef}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
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
