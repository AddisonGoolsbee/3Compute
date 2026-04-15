import { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router';
import Footer from '../components/Footer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  Download,
  X,
  Filter,
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
} from 'lucide-react';
import { apiUrl, backendUrl, UserDataContext } from '../util/UserData';
import { printMarkdownElement } from '../util/printMarkdown';

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

  const lessonNames = Object.keys(meta).filter((name) => {
    const lesson = meta[name];
    if (!lesson.lessonPlanDoc) return false;
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
      setLessonPlanContent(res.ok ? await res.text() : 'Failed to load lesson plan.');
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
    <div className="-mt-20 text-white min-h-screen flex flex-col">
      <header className="pt-24 pb-6 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Lessons</h1>
          <p className="text-gray-400">
            Browse and import ready-to-use projects into your classrooms.
          </p>
        </div>
      </header>

      {/* Standards filter */}
      <div className="px-6 pb-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="lum-btn lum-pad-sm rounded-lg border border-gray-600 hover:border-gray-400 text-sm inline-flex items-center gap-2 transition-colors"
          >
            <Filter size={14} />
            Filter by CSTA Standard
            {selectedStandards.size > 0 && (
              <span className="bg-purple-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {selectedStandards.size}
              </span>
            )}
            {filterOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {filterOpen && (() => {
            const categoryNames: Record<string, string> = {
              AP: 'Algorithms & Programming',
              CS: 'Computing Systems',
              DA: 'Data & Analysis',
              IC: 'Impacts of Computing',
              NI: 'Networks & the Internet',
            };
            const grouped: Record<string, Standard[]> = {};
            for (const s of allStandards) {
              const cat = s.id.replace(/^[^-]+-/, '').replace(/-\d+$/, '');
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(s);
            }
            const sortedCategories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
            return (
              <div className="mt-3 border border-gray-700 rounded-lg p-4 lum-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-300">CSTA Standards</span>
                  {selectedStandards.size > 0 && (
                    <button
                      onClick={() => setSelectedStandards(new Set())}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <X size={12} />
                      Clear all
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  {sortedCategories.map((cat) => (
                    <div key={cat}>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        {categoryNames[cat] || cat}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {grouped[cat].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => toggleStandard(s.id)}
                            className={`text-left text-xs px-3 py-2 rounded-md border transition-colors ${
                              selectedStandards.has(s.id)
                                ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                                : 'border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <span className="font-medium">{s.id}</span>
                            <span className="text-[11px] opacity-70 ml-1.5">{s.description}</span>
                          </button>
                        ))}
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
      <main className="flex-1 px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          {lessonNames.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              {Object.keys(meta).length === 0 ? 'Loading...' : 'No lessons match the selected standards.'}
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
                    selectedStandards={selectedStandards}
                    isTeacher={isTeacher}
                    onViewPlan={() => openLessonPlan(name)}
                    onImport={() => openImportDialog(name)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Lesson plan viewer overlay */}
      {activeLessonPlan && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setActiveLessonPlan(null)} />
          <div className="relative ml-auto w-full max-w-3xl bg-gray-900 border-l border-gray-700 flex flex-col h-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Lesson Plan</div>
                <div className="font-semibold">{activeLessonPlan.replace(/[-_]/g, ' ')}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (lessonPlanRef.current) printMarkdownElement(lessonPlanRef.current, activeLessonPlan.replace(/[-_]/g, ' ')); }}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                  title="Print lesson plan"
                >
                  <Printer size={18} />
                </button>
                <button
                  onClick={() => openImportDialog(activeLessonPlan)}
                  className="lum-btn lum-pad-sm rounded-lg bg-[#54daf4] hover:bg-[#3cc8e2] text-gray-950 font-medium text-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <Download size={13} />
                  Import to Classroom
                </button>
                <button
                  onClick={() => setActiveLessonPlan(null)}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingPlan ? (
                <div className="text-center text-gray-500 py-12">Loading...</div>
              ) : (
                <div className="markdown-content" ref={lessonPlanRef}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{lessonPlanContent}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowImportDialog(null); setImportError(null); setImportSuccess(null); }}
          />
          <div
            className="relative border border-gray-700 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh]"
            style={{ backgroundColor: 'var(--color-bg, #0f1623)' }}
          >
            {!isLoggedIn ? (
              <div className="p-6 flex flex-col gap-4">
                <h2 className="text-lg font-semibold">Sign in required</h2>
                <p className="text-sm text-gray-400">You need to sign in before importing a lesson.</p>
                <a
                  href={`${apiUrl}/auth/login`}
                  className="lum-btn lum-pad-md rounded-lg bg-[#54daf4] hover:bg-[#3cc8e2] text-gray-950 font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <LogIn size={18} />
                  Sign in with Google
                </a>
                <button
                  onClick={() => setShowImportDialog(null)}
                  className="lum-btn lum-pad-sm rounded-lg border border-gray-600 hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-700/60 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">Import lesson</div>
                    <h2 className="text-xl font-semibold">&ldquo;{showImportDialog.replace(/[-_]/g, ' ')}&rdquo;</h2>
                  </div>
                  <button
                    onClick={() => { setShowImportDialog(null); setImportError(null); setImportSuccess(null); }}
                    className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 overflow-y-auto flex flex-col gap-6">
                  {importError && (
                    <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                      {importError}
                    </div>
                  )}

                  {/* Workspace section */}
                  <section>
                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                      <User size={12} />
                      Just me
                    </div>
                    <button
                      disabled={importing}
                      onClick={() => importLesson(showImportDialog, { kind: 'workspace' })}
                      className="w-full text-left rounded-xl border border-gray-700 hover:border-[#54daf4]/60 hover:bg-[#54daf4]/5 transition-colors p-4 flex items-start gap-3 group disabled:opacity-50"
                    >
                      <div className="mt-0.5 p-2 rounded-lg bg-[#54daf4]/10 border border-[#54daf4]/30 group-hover:bg-[#54daf4]/20 transition-colors">
                        <User size={18} className="text-[#54daf4]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">Import to my workspace</span>
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 bg-gray-800 rounded px-1.5 py-0.5">
                            Private
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Adds the lesson files straight to your IDE, alongside your own files. Not linked to any classroom.
                        </p>
                      </div>
                      {importSuccess === destinationKey({ kind: 'workspace' }) && (
                        <Check size={16} className="text-green-400 mt-3 shrink-0" />
                      )}
                    </button>
                  </section>

                  {/* Classrooms section */}
                  <section>
                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                      <GraduationCap size={12} />
                      Your classrooms
                    </div>

                    {loadingClassrooms ? (
                      <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
                    ) : classrooms.length === 0 ? (
                      <div className="text-sm text-gray-500 px-3 py-4 rounded-lg bg-gray-800/30 border border-gray-700/50">
                        You aren&rsquo;t a teacher in any classrooms yet.
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2 px-3 py-2 mb-3 rounded-lg bg-gray-800/40 border border-gray-700/50">
                          <Info size={13} className="text-gray-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-gray-400 leading-snug">
                            <span className="text-yellow-300 font-medium">Draft</span> keeps the lesson private in
                            the classroom&rsquo;s <code className="text-[11px] bg-gray-900 rounded px-1">drafts/</code> folder so you can
                            edit before students see it. <span className="text-green-300 font-medium">Publish</span>{' '}
                            moves it into <code className="text-[11px] bg-gray-900 rounded px-1">assignments/</code> and
                            distributes copies to every current student immediately.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          {classrooms.map((classroom) => (
                            <div
                              key={classroom.id}
                              className="rounded-xl border border-gray-700 bg-gray-900/30 overflow-hidden"
                            >
                              <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                                <div className="min-w-0">
                                  <div className="font-medium truncate text-gray-100">{classroom.name}</div>
                                  <div className="text-xs text-gray-500">{classroom.studentCount} student{classroom.studentCount === 1 ? '' : 's'}</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    disabled={importing}
                                    onClick={() => importLesson(showImportDialog, { kind: 'draft', classroomId: classroom.id })}
                                    title="Stage as draft for editing. Not visible to students yet."
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-yellow-200 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                                  >
                                    <FileEdit size={14} />
                                    Save as draft
                                    {importSuccess === destinationKey({ kind: 'draft', classroomId: classroom.id }) && (
                                      <Check size={14} className="text-green-400" />
                                    )}
                                  </button>
                                  <button
                                    disabled={importing}
                                    onClick={() => importLesson(showImportDialog, { kind: 'publish', classroomId: classroom.id })}
                                    title="Distribute to every current student in this classroom immediately."
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-green-200 bg-green-600/25 border border-green-500/40 hover:bg-green-600/40 transition-colors font-medium disabled:opacity-50"
                                  >
                                    <Send size={14} />
                                    Publish
                                    {importSuccess === destinationKey({ kind: 'publish', classroomId: classroom.id }) && (
                                      <Check size={14} className="text-green-400" />
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
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-700/60 flex items-center justify-end gap-3">
                  <button
                    onClick={() => { setShowImportDialog(null); setImportError(null); setImportSuccess(null); }}
                    className="px-3 py-1.5 rounded-lg text-sm border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LessonCard({
  displayName,
  lesson,
  selectedStandards,
  isTeacher,
  onViewPlan,
  onImport,
}: {
  displayName: string;
  lesson: LessonMeta;
  selectedStandards: Set<string>;
  isTeacher: boolean;
  onViewPlan: () => void;
  onImport: () => void;
}) {
  return (
    <div className="lum-card border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold">{displayName}</h2>
            {lesson.duration && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-800 rounded-full px-2.5 py-1 flex-shrink-0">
                <Clock size={11} />
                {lesson.duration}
              </span>
            )}
            {(lesson.testCount ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 flex-shrink-0 text-green-400 bg-green-400/10">
                <FlaskConical size={11} />
                Tests included
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-300 text-sm mb-4">{lesson.description}</p>

          {/* Included files */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <FileText size={12} />
              Includes:
            </span>
            {lesson.files.map((f) => (
              <span
                key={f}
                className="text-xs bg-gray-800 text-gray-400 rounded px-2 py-0.5 font-mono"
              >
                {f}
              </span>
            ))}
          </div>

          {/* CSTA standards */}
          {(lesson.standards ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(lesson.standards ?? []).map((s) => (
                <span
                  key={s.id}
                  title={s.description}
                  className={`text-xs px-2 py-0.5 rounded border ${
                    selectedStandards.has(s.id)
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-gray-700 text-gray-500'
                  }`}
                >
                  {s.id}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {lesson.lessonPlanDoc && (
            <button
              onClick={onViewPlan}
              className="lum-btn lum-pad-sm rounded-lg border border-gray-600 hover:border-[#54daf4]/50 hover:bg-[#54daf4]/5 text-sm inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <BookOpen size={14} />
              View Lesson Plan
            </button>
          )}
          {isTeacher && lesson.solutionDoc && (
            <a
              href={backendUrl + lesson.solutionDoc}
              download
              className="lum-btn lum-pad-sm rounded-lg border border-gray-600 hover:border-purple-500/50 hover:bg-purple-500/5 text-sm inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Code size={14} className="text-purple-400" />
              <span className="text-purple-300">Reference Solution</span>
            </a>
          )}
          <button
            onClick={onImport}
            className="lum-btn lum-pad-sm rounded-lg bg-[#54daf4] hover:bg-[#3cc8e2] text-gray-950 font-medium text-sm inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download size={14} />
            Import to Classroom
          </button>
        </div>
      </div>
    </div>
  );
}
