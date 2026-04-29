import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router';
import Footer from '../components/Footer';
import MonacoEditor from '@monaco-editor/react';
import { setupDaylightTheme, DAYLIGHT_THEME } from '../util/monacoTheme';
import {
  Copy, Check, Settings, Play,
  RefreshCw, KeyRound, Pencil,
  FileText, ExternalLink, ChevronRight, FlaskConical,
  HelpCircle, BookOpen, Upload, Trash2, Send, X,
} from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import { languageMap } from '../util/languageMap';
import { PrimaryButton, GhostButton, Pill } from '../components/ui/Buttons';
import { cn } from '../util/cn';

interface StudentResult {
  passed: number;
  total: number;
}

interface Student {
  id: string;
  email: string;
  name: string;
  results: Record<string, StudentResult>;
}

interface ProgressData {
  students: Student[];
  templates: string[];
}

type GradingMode = 'equal' | 'weighted' | 'manual';

interface WeightsData {
  grading_mode: GradingMode;
  weights: Record<string, number>;
}

type ManualScores = Record<string, Record<string, number>>; // user_id -> template -> score

interface ClassroomInfo {
  id: string;
  name: string;
  access_code: string;
  joins_paused: boolean;
  grading_mode: GradingMode;
  participants: string[];
}

const AVATAR_COLORS = ['bg-tomato', 'bg-navy', 'bg-forest', 'bg-ochre', 'bg-plum'];

function avatarInitials(nameOrEmail: string) {
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return '?';
  if (trimmed.includes(' ')) {
    return trimmed
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

interface ClassroomDetailProps {
  /** Demo mode renders the same page sourced from /api/demo (no auth, no
   *  mutations). Used by the public marketing demo route. */
  demoMode?: boolean;
  /** Used in demo mode where ``id`` from useParams isn't set. */
  classroomIdOverride?: string;
}

export default function ClassroomDetailPage({
  demoMode: demoModeProp = false,
  classroomIdOverride,
}: ClassroomDetailProps = {}) {
  const userData = useContext(UserDataContext);
  const { id: paramId } = useParams();
  const location = useLocation();
  // Force demo mode whenever the URL is under /demo. Belt-and-suspenders:
  // a stale bundle, broken HMR, or a missing prop on the wrapper page
  // would otherwise put us into the real-classroom code path with id
  // ``undefined`` and 401 every fetch. Detecting the route here makes the
  // demo bulletproof against frontend caching.
  const demoMode = demoModeProp || location.pathname.startsWith('/demo');
  const id = classroomIdOverride ?? (demoMode ? 'demo' : paramId);
  const [searchParams] = useSearchParams();
  const readOnly = demoMode;
  // Single source of truth for the per-classroom REST base. Real classrooms
  // hit /api/classrooms/{id}; the demo router hangs everything off /api/demo.
  const apiBase = demoMode ? `${apiUrl}/demo` : `${apiUrl}/classrooms/${id}`;
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [weights, setWeights] = useState<WeightsData | null>(null);
  // Per-classroom membership role: instructors see Students/Gradebook tabs and
  // teacher controls; participants see a stripped-down assignments-only view.
  // The caller's *global* role (teacher/student) is not a substitute — a
  // teacher can still join another classroom as a participant.
  const [isInstructor, setIsInstructor] = useState<boolean>(demoMode);
  const [activeTab, setActiveTab] = useState<'students' | 'gradebook' | 'assignments'>(() => {
    // Honor `?tab=assignments` so links like post-import navigation land on
    // the right tab instead of the default Students view.
    const initial = searchParams.get('tab');
    return initial === 'assignments' || initial === 'gradebook' || initial === 'students' ? initial : 'students';
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [runningTests, setRunningTests] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  const fetchClassroom = useCallback(async () => {
    if (demoMode) {
      const res = await fetch(`${apiBase}/classroom`, { credentials: 'include' });
      if (res.ok) setClassroom(await res.json());
      return;
    }
    const res = await fetch(`${apiUrl}/classrooms/`, { credentials: 'include' });
    const data = await res.json();
    const owner = [...(data.owner ?? []), ...(data.owner_archived ?? [])];
    const joined = [...(data.joined ?? []), ...(data.joined_archived ?? [])];
    const ownerMatch = owner.find((c: ClassroomInfo) => c.id === id);
    if (ownerMatch) {
      setClassroom(ownerMatch);
      setIsInstructor(true);
      return;
    }
    const joinedMatch = joined.find((c: ClassroomInfo) => c.id === id);
    if (joinedMatch) {
      setClassroom(joinedMatch);
      setIsInstructor(false);
    }
  }, [id, demoMode, apiBase]);

  const fetchProgress = useCallback(async () => {
    const res = await fetch(`${apiBase}/progress`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setProgress(data);
      if (!selectedTemplate && data.templates.length > 0) {
        setSelectedTemplate(data.templates[0]);
      }
    }
  }, [apiBase, selectedTemplate]);

  const fetchMyProgress = useCallback(async () => {
    const res = await fetch(`${apiBase}/my-progress`, { credentials: 'include' });
    if (res.ok) {
      const data: { templates: string[]; results: Record<string, StudentResult> } = await res.json();
      setProgress({
        students: [],
        templates: data.templates,
      });
    }
  }, [apiBase]);

  const fetchWeights = useCallback(async () => {
    const res = await fetch(`${apiBase}/weights`, { credentials: 'include' });
    if (res.ok) {
      setWeights(await res.json());
    }
  }, [apiBase]);

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => { document.documentElement.style.overflowY = 'hidden'; };
  }, []);

  useEffect(() => {
    // Resolve the classroom first so we know which detail endpoints to call:
    // /progress and /weights are instructor-only (403 for participants), and
    // /my-progress is participant-friendly. The second effect picks the right
    // pair once `classroom` and `isInstructor` are known.
    fetchClassroom().finally(() => setLoading(false));
  }, [fetchClassroom]);

  useEffect(() => {
    if (!classroom) return;
    if (demoMode || isInstructor) {
      fetchProgress();
      fetchWeights();
    } else {
      fetchMyProgress();
    }
  }, [classroom, demoMode, isInstructor, fetchProgress, fetchMyProgress, fetchWeights]);

  const runTests = async (templateName?: string) => {
    if (readOnly) return;
    setRunningTests(true);
    try {
      await fetch(`${apiBase}/run-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ template_name: templateName ?? null }),
      });
      await fetchProgress();
    } finally {
      setRunningTests(false);
    }
  };

  const toggleJoins = async () => {
    if (readOnly || !classroom) return;
    const res = await fetch(`${apiBase}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ joins_paused: !classroom.joins_paused }),
    });
    if (res.ok) {
      setClassroom({ ...classroom, joins_paused: !classroom.joins_paused });
    }
  };

  const regenerateCode = async () => {
    if (readOnly) return;
    const res = await fetch(`${apiBase}/access-code`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (classroom) setClassroom({ ...classroom, access_code: data.access_code });
    }
  };

  const submitRename = async () => {
    if (readOnly || !renameValue.trim()) return;
    const res = await fetch(`${apiBase}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    if (res.ok) {
      if (classroom) setClassroom({ ...classroom, name: renameValue.trim() });
    }
    setRenaming(false);
  };

  const startRename = () => {
    if (!classroom) return;
    setRenameValue(classroom.name);
    setRenaming(true);
  };

  const copyCode = () => {
    if (!classroom) return;
    navigator.clipboard.writeText(classroom.access_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  const saveWeights = async (newWeights: WeightsData) => {
    if (readOnly) return;
    setWeights(newWeights);
    try {
      const res = await fetch(`${apiBase}/weights`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newWeights),
      });
      if (res.ok) {
        const saved: WeightsData = await res.json();
        setWeights(saved);
      }
    } catch { /* ignore */ }
  };

  if (!demoMode && !userData?.userInfo) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="body text-ink-muted">Loading…</div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen flex items-center justify-center px-7">
        <div className="bg-paper-elevated border border-rule-soft rounded-xl shadow-sm p-10 text-center max-w-md w-full">
          {demoMode ? (
            <>
              <p className="body text-ink-strong font-semibold mb-2">Demo classroom unavailable</p>
              <p className="body-sm text-ink-default mb-4">
                The backend hasn't seeded the demo classroom yet. If you just
                started the stack, give it a moment and refresh; otherwise check{' '}
                <code className="bg-paper-tinted text-navy font-mono text-xs px-1 py-0.5 rounded-sm">docker compose logs backend</code>{' '}
                for a "Failed to seed demo classroom" line.
              </p>
              <Link
                to="/demo"
                className="text-navy hover:text-navy/80 font-semibold no-underline"
              >
                Go to the demo workspace
              </Link>
            </>
          ) : (
            <>
              <p className="body text-ink-default mb-4">Classroom not found.</p>
              <Link
                to="/classrooms"
                className="text-navy hover:text-navy/80 font-semibold no-underline"
              >
                Back to classrooms
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const formattedCode = classroom.access_code.length === 6
    ? `${classroom.access_code.slice(0, 3)}-${classroom.access_code.slice(3)}`
    : classroom.access_code;

  const studentCount = classroom.participants?.length ?? 0;
  const templateCount = progress?.templates.length ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="max-w-[1100px] mx-auto px-7 py-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
            <div className="flex-1 min-w-0">
              <span className="eyebrow text-tomato">Classroom</span>
              <div className="flex items-center gap-3 mt-2">
                {renaming && !readOnly ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename();
                      if (e.key === 'Escape') setRenaming(false);
                    }}
                    onBlur={submitRename}
                    className="bg-paper border border-rule rounded-md px-3 py-1.5 text-ink-strong text-2xl font-display font-semibold outline-none focus:ring-2 focus:ring-navy/30 min-w-0 flex-1"
                    autoFocus
                  />
                ) : (
                  <h1 className="heading-1">{classroom.name}</h1>
                )}
              </div>
              <p className="body-sm mt-2">
                {studentCount} {studentCount === 1 ? 'student' : 'students'} ·{' '}
                {templateCount} {templateCount === 1 ? 'assignment' : 'assignments'}
                {classroom.joins_paused && (
                  <>
                    {' · '}
                    <span className="text-ochre font-semibold">Joins paused</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <code className="bg-ochre-soft text-ochre border border-ochre/30 px-3 py-1.5 rounded-md font-mono text-sm tracking-[0.12em] font-semibold inline-flex items-center gap-2">
                {formattedCode}
              </code>
              <button
                type="button"
                onClick={copyCode}
                className="text-ochre hover:bg-ochre/10 rounded-sm p-1.5 cursor-pointer transition-colors"
                title="Copy join code"
                aria-label="Copy join code"
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              </button>

              {!readOnly && (
                <Link
                  to={`/ide?classroom=${classroom.id}`}
                  className="text-navy hover:text-navy/80 font-semibold no-underline inline-flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-paper-tinted text-sm transition-colors"
                  title="Open this classroom in your workspace"
                >
                  <ExternalLink size={14} />
                Open in workspace
                </Link>
              )}

              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="p-2 rounded-md hover:bg-paper-tinted text-ink-muted hover:text-ink-strong cursor-pointer transition-colors"
                title="How classrooms work"
                aria-label="How classrooms work"
              >
                <HelpCircle size={18} />
              </button>

              {!readOnly && isInstructor && (
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="p-2 rounded-md hover:bg-paper-tinted text-ink-muted hover:text-ink-strong cursor-pointer transition-colors"
                  title="Classroom settings"
                  aria-label="Classroom settings"
                >
                  <Settings size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs — instructor-only. Participants only see published assignments. */}
          {(demoMode || isInstructor) && (
            <div className="flex gap-1 mb-5 border-b border-rule-soft">
              {(['students', 'gradebook', 'assignments'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-3 bg-transparent border-0 cursor-pointer text-sm font-semibold border-b-2 -mb-px font-sans transition-colors capitalize',
                    activeTab === tab
                      ? 'border-navy text-ink-strong'
                      : 'border-transparent text-ink-muted hover:text-ink-strong',
                  )}
                >
                  {tab === 'students' ? 'Students' : tab === 'gradebook' ? 'Gradebook' : 'Assignments'}
                </button>
              ))}
            </div>
          )}

          {(demoMode || isInstructor) && activeTab === 'students' ? (
            <StudentsTab
              classroomId={id!}
              apiBase={apiBase}
              readOnly={readOnly}
              progress={progress}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
              onRunTests={runTests}
              runningTests={runningTests}
            />
          ) : (demoMode || isInstructor) && activeTab === 'gradebook' ? (
            <GradebookTab
              apiBase={apiBase}
              readOnly={readOnly}
              progress={progress}
              weights={weights}
              onSaveWeights={saveWeights}
              onRunTests={runTests}
              runningTests={runningTests}
            />
          ) : (
            <AssignmentsTab
              classroomId={id!}
              apiBase={apiBase}
              readOnly={readOnly}
              isInstructor={demoMode || isInstructor}
              templates={progress?.templates ?? []}
              onPublished={(demoMode || isInstructor) ? fetchProgress : fetchMyProgress}
            />
          )}
        </div>
      </main>

      <Footer />

      {settingsOpen && (
        <SettingsDialog
          classroom={classroom}
          onClose={() => setSettingsOpen(false)}
          onTogglePause={async () => {
            await toggleJoins();
          }}
          onRegenerate={async () => {
            await regenerateCode();
          }}
          onRename={() => {
            setSettingsOpen(false);
            startRename();
          }}
        />
      )}

      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings dialog
// ---------------------------------------------------------------------------

function SettingsDialog({
  classroom,
  onClose,
  onTogglePause,
  onRegenerate,
  onRename,
}: {
  classroom: ClassroomInfo;
  onClose: () => void;
  onTogglePause: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onRename: () => void;
}) {
  const [paused, setPaused] = useState(classroom.joins_paused);
  const [working, setWorking] = useState(false);

  const handleTogglePause = async () => {
    setWorking(true);
    try {
      setPaused((p) => !p);
      await onTogglePause();
    } finally {
      setWorking(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate the join code? Existing students stay in the classroom, but the old code stops working.')) return;
    setWorking(true);
    try {
      await onRegenerate();
    } finally {
      setWorking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-strong/60 flex items-center justify-center p-7"
      onClick={onClose}
    >
      <div
        className="bg-paper-elevated border border-rule-soft rounded-xl shadow-lg p-7 max-w-[520px] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2 className="heading-3">Classroom settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-sm text-ink-muted hover:text-ink-strong hover:bg-paper-tinted cursor-pointer transition-colors"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-4 py-3 border-b border-rule-soft">
            <div className="flex-1 min-w-0">
              <p className="body text-ink-strong font-semibold">Pause joins</p>
              <p className="body-sm">New students cannot join with the code while paused.</p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="accent-navy w-4 h-4 cursor-pointer"
                checked={paused}
                onChange={handleTogglePause}
                disabled={working}
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 py-3 border-b border-rule-soft">
            <div className="flex-1 min-w-0">
              <p className="body text-ink-strong font-semibold">Regenerate join code</p>
              <p className="body-sm">Old code stops working. Existing students stay enrolled.</p>
            </div>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={working}
              className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-paper-tinted text-sm cursor-pointer transition-colors disabled:opacity-50"
            >
              <KeyRound size={14} />
              Regenerate
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="body text-ink-strong font-semibold">Rename classroom</p>
              <p className="body-sm">Change the display name of this classroom.</p>
            </div>
            <button
              type="button"
              onClick={onRename}
              className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-paper-tinted text-sm cursor-pointer transition-colors"
            >
              <Pencil size={14} />
              Rename
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Help dialog
// ---------------------------------------------------------------------------

function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink-strong/60 flex items-center justify-center p-7 overflow-auto"
      onClick={onClose}
    >
      <div
        className="bg-paper-elevated border border-rule-soft rounded-xl shadow-lg p-7 max-w-[640px] w-full my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2 className="heading-3">How classrooms work</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-sm text-ink-muted hover:text-ink-strong hover:bg-paper-tinted cursor-pointer transition-colors"
            aria-label="Close help"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <HelpStep n={1} title="Upload your assignment folder">
            Go to the <strong className="text-ink-strong font-semibold">Assignments</strong> tab and click{' '}
            <strong className="text-ink-strong font-semibold">Upload assignment</strong> to add a folder with your
            starter code and any <code className="bg-paper-tinted text-navy font-mono text-sm px-1.5 py-0.5 rounded-sm">test_*.py</code> files.
            This is exactly what students will start with. Or, import a lesson from the{' '}
            <strong className="text-ink-strong font-semibold">Lessons</strong> page directly into your classroom
            to use its code as-is.
          </HelpStep>

          <HelpStep n={2} title="Edit your draft and publish">
            Uploaded folders appear as drafts in the{' '}
            <strong className="text-ink-strong font-semibold">Assignments</strong> tab. Click{' '}
            <strong className="text-ink-strong font-semibold">Edit in workspace</strong> to refine files before
            distributing, then click <strong className="text-ink-strong font-semibold">Publish</strong> when
            ready. Drafts are synced with the classroom's drafts folder in your workspace, so you can also create and
            manage drafts there. To publish from the workspace, move the folder into{' '}
            <code className="bg-paper-tinted text-navy font-mono text-sm px-1.5 py-0.5 rounded-sm">assignments</code>.
          </HelpStep>

          <HelpStep n={3} title="Students get a copy automatically">
            When you publish, every current student gets their own editable copy, and future students who join
            pick up every published assignment automatically. You can keep editing{' '}
            <code className="bg-paper-tinted text-navy font-mono text-sm px-1.5 py-0.5 rounded-sm">assignments/</code>{' '}
            freely — existing students' copies aren't touched, so their work is safe. They can always see your
            latest version through a hidden{' '}
            <code className="bg-paper-tinted text-navy font-mono text-sm px-1.5 py-0.5 rounded-sm">.templates/</code>{' '}
            folder.
          </HelpStep>

          <HelpStep n={4} title="Share the join code with students">
            Students enter the code on the Classrooms page to join. You can pause joins or regenerate the code
            from the settings menu above.
          </HelpStep>

          <div className="border-t border-rule-soft pt-4 flex flex-col gap-2">
            <p className="body-sm text-ink-default">
              <strong className="text-ink-strong font-semibold">Test files:</strong>{' '}
              Files named <code className="bg-paper-tinted text-navy font-mono text-sm px-1.5 py-0.5 rounded-sm">test_*.py</code> are
              used for automated grading. Students can see them but can't modify them.
            </p>
            <p className="body-sm text-ink-default">
              <strong className="text-ink-strong font-semibold">Removing assignments:</strong>{' '}
              Delete the assignment from the{' '}
              <strong className="text-ink-strong font-semibold">Assignments</strong> tab. Students keep their
              existing copies, but it won't appear in the gradebook or be given to new students.
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <PrimaryButton color="navy" onClick={onClose}>Got it</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function HelpStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 w-7 h-7 rounded-full bg-navy-soft text-navy flex items-center justify-center text-xs font-bold shrink-0">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="heading-4">{title}</p>
        <p className="body-sm text-ink-default mt-1">{children}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Students Tab
// ---------------------------------------------------------------------------

function getMonacoLanguage(filename: string): string {
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  for (const lang of Object.values(languageMap)) {
    if (lang.extensions.includes(ext)) return lang.language;
  }
  return 'plaintext';
}

function StudentsTab({
  classroomId,
  apiBase,
  readOnly,
  progress,
  selectedTemplate,
  onSelectTemplate,
  onRunTests,
  runningTests,
}: {
  classroomId: string;
  apiBase: string;
  readOnly: boolean;
  progress: ProgressData | null;
  selectedTemplate: string;
  onSelectTemplate: (t: string) => void;
  onRunTests: (t?: string) => void;
  runningTests: boolean;
}) {
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [studentFiles, setStudentFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showTestOutput, setShowTestOutput] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{ passed: number; total: number } | null>(null);

  const runStudentTests = async (studentEmail: string) => {
    if (readOnly) return;
    setShowTestOutput(true);
    setSelectedFile(null);
    setFileContent(null);
    setTestRunning(true);
    setTestOutput(null);
    setTestResult(null);
    try {
      const res = await fetch(
        `${apiBase}/run-student-tests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            student_email: studentEmail,
            template_name: selectedTemplate,
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setTestOutput(data.output || 'No output.');
        setTestResult({ passed: data.passed, total: data.total });
      } else {
        setTestOutput('Failed to run tests.');
      }
    } catch {
      setTestOutput('Failed to run tests.');
    } finally {
      setTestRunning(false);
    }
  };

  const toggleStudent = async (studentEmail: string) => {
    if (expandedStudent === studentEmail) {
      setExpandedStudent(null);
      setStudentFiles([]);
      setSelectedFile(null);
      setFileContent(null);
      setShowTestOutput(false);
      setTestOutput(null);
      setTestResult(null);
      return;
    }
    setExpandedStudent(studentEmail);
    setSelectedFile(null);
    setFileContent(null);
    setShowTestOutput(false);
    setTestOutput(null);
    setTestResult(null);
    setLoadingFiles(true);
    try {
      const res = await fetch(
        `${apiBase}/student-files?email=${encodeURIComponent(studentEmail)}&template=${encodeURIComponent(selectedTemplate)}`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = await res.json();
        // Filter out hidden files (starting with .)
        setStudentFiles((data.files as string[]).filter((f) => !f.split('/').some((seg) => seg.startsWith('.') || seg === '__pycache__')));
      } else {
        setStudentFiles([]);
      }
    } catch {
      setStudentFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const viewFile = async (fileName: string) => {
    if (!expandedStudent) return;
    setSelectedFile(fileName);
    setFileContent(null);
    setLoadingContent(true);
    try {
      const path = `${selectedTemplate}/${fileName}`;
      const res = await fetch(
        `${apiBase}/student-file?email=${encodeURIComponent(expandedStudent)}&path=${encodeURIComponent(path)}`,
        { credentials: 'include' },
      );
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
      } else {
        setFileContent('Failed to load file.');
      }
    } catch {
      setFileContent('Failed to load file.');
    } finally {
      setLoadingContent(false);
    }
  };

  // Collapse when switching templates
  useEffect(() => {
    setExpandedStudent(null);
    setStudentFiles([]);
    setSelectedFile(null);
    setFileContent(null);
    setShowTestOutput(false);
    setTestOutput(null);
    setTestResult(null);
  }, [selectedTemplate]);

  if (!progress || (progress.templates.length === 0 && progress.students.length === 0)) {
    return (
      <div className="py-6 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <BookOpen size={40} className="mx-auto mb-3 text-ink-faint" />
          <h2 className="heading-3 mb-1">No assignments yet</h2>
          <p className="body-sm">Add your first assignment to get started.</p>
        </div>

        <div className="bg-paper-elevated border border-rule-soft rounded-xl shadow-sm divide-y divide-rule-soft">
          <div className="px-5 py-4 flex gap-4">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-navy-soft flex items-center justify-center text-xs font-semibold text-navy shrink-0">1</div>
            <div className="min-w-0">
              <p className="body text-ink-strong font-semibold">Upload your assignment folder</p>
              <p className="body-sm mt-1 text-ink-default">
                Go to the <span className="text-ink-strong font-semibold">Assignments</span> tab and click <span className="text-ink-strong font-semibold">Upload Folder</span> to
                add a folder with your starter code and any <code className="bg-paper-tinted text-navy px-1 py-0.5 rounded-sm font-mono text-[12px]">test_*.py</code> files.
                This is exactly what students will start with.
                Or, import a lesson from the <span className="text-ink-strong font-semibold">Lessons</span> page directly into your classroom to use its code as-is.
              </p>
            </div>
          </div>
          <div className="px-5 py-4 flex gap-4">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-navy-soft flex items-center justify-center text-xs font-semibold text-navy shrink-0">2</div>
            <div className="min-w-0">
              <p className="body text-ink-strong font-semibold">Edit your draft and publish</p>
              <p className="body-sm mt-1 text-ink-default">
                Uploaded folders appear as drafts in the <span className="text-ink-strong font-semibold">Assignments</span> tab.
                Click <span className="text-ink-strong font-semibold">Edit in IDE</span> to refine files before distributing,
                then click <span className="text-ink-strong font-semibold">Publish</span> when ready.
                Drafts are synced with the classroom&rsquo;s drafts folder in the IDE, so you can also create and manage drafts there.
                To publish from the IDE, move the folder into <code className="bg-paper-tinted text-navy px-1 py-0.5 rounded-sm font-mono text-[12px]">assignments</code>. This publishes it immediately.
              </p>
            </div>
          </div>
          <div className="px-5 py-4 flex gap-4">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-navy-soft flex items-center justify-center text-xs font-semibold text-navy shrink-0">3</div>
            <div className="min-w-0">
              <p className="body text-ink-strong font-semibold">Students get a copy automatically</p>
              <p className="body-sm mt-1 text-ink-default">
                When you publish, every current student gets their own editable copy, and future students who join pick up every published assignment automatically.
                You can keep editing <code className="bg-paper-tinted text-navy px-1 py-0.5 rounded-sm font-mono text-[12px]">assignments/</code> freely &mdash; existing students&rsquo; copies aren&rsquo;t touched, so their work is safe.
                They can always see your latest version through a hidden <code className="bg-paper-tinted text-navy px-1 py-0.5 rounded-sm font-mono text-[12px]">.templates/</code> folder inside their classroom (they flip <span className="text-ink-strong font-semibold">Show hidden files</span> in the file explorer to see it), which is useful when you fix a bug or they want the original files back.
              </p>
            </div>
          </div>
          <div className="px-5 py-4 flex gap-4">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-navy-soft flex items-center justify-center text-xs font-semibold text-navy shrink-0">4</div>
            <div className="min-w-0">
              <p className="body text-ink-strong font-semibold">Share the join code with students</p>
              <p className="body-sm mt-1 text-ink-default">
                Students enter the code on the Classrooms page to join. You can pause joins or regenerate the code from the settings menu above.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-paper-elevated border border-rule-soft rounded-lg px-5 py-3 space-y-2">
          <p className="text-xs text-ink-muted">
            <span className="text-ink-strong font-semibold">Test files:</span>{' '}
            Files named <code className="bg-paper-tinted text-navy px-1 py-0.5 rounded-sm font-mono text-[12px]">test_*.py</code> are used for automated grading. Students can see them but can&rsquo;t modify them. You can also import lessons with pre-written tests from the <span className="text-ink-strong font-semibold">Lessons</span> page.
          </p>
          <p className="text-xs text-ink-muted">
            <span className="text-ink-strong font-semibold">Removing assignments:</span>{' '}
            Delete the assignment from the <span className="text-ink-strong font-semibold">Assignments</span> tab, or remove the folder from{' '}
            <code className="bg-paper-tinted text-navy px-1 py-0.5 rounded-sm font-mono text-[12px]">assignments</code> in the IDE.
            Students keep their existing copies, but it won&rsquo;t appear in the gradebook or be given to new students.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {progress.templates.length > 0 ? (
        <div className="flex items-center justify-between gap-4 mb-3.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-ink-muted text-xs uppercase tracking-wider mr-2 font-semibold">
              Assignment
            </span>
            {progress.templates.map((t) => {
              const active = selectedTemplate === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onSelectTemplate(t)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-[13px] border cursor-pointer font-sans font-semibold whitespace-nowrap transition-colors',
                    active
                      ? 'bg-navy text-white border-navy'
                      : 'bg-transparent border-rule text-ink-muted hover:text-ink-strong',
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-3 shrink-0">
              <span className="caption">Scores update when you run tests.</span>
              <button
                type="button"
                onClick={() => onRunTests(selectedTemplate)}
                disabled={runningTests}
                className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-paper-tinted text-sm cursor-pointer transition-colors disabled:opacity-50"
              >
                {runningTests ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                {runningTests ? 'Running…' : 'Run tests'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="body-sm mb-3.5">No assignments yet — upload one in the Assignments tab to start grading.</p>
      )}

      {progress.students.length === 0 ? (
        <div className="bg-paper-elevated border border-rule-soft rounded-lg shadow-sm p-10 text-center body-sm">
          No students have joined yet.
        </div>
      ) : (
        <div className="bg-paper-elevated border border-rule-soft rounded-lg p-2 shadow-sm">
          {progress.students.map((student, idx) => {
            const result = student.results[selectedTemplate];
            const passed = result?.passed ?? 0;
            const total = result?.total ?? 0;
            const passing = total > 0 && passed === total;
            const partial = passed > 0 && passed < total;
            const isExpanded = expandedStudent === student.email;
            const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const initials = avatarInitials(student.name || student.email);
            const progressPct = total > 0 ? (passed / total) * 100 : 0;
            const progressColor = passing ? 'bg-forest' : partial ? 'bg-ochre' : 'bg-tomato';
            const labelColor = passing ? 'text-forest' : partial ? 'text-ochre' : 'text-tomato';

            return (
              <div key={student.id}>
                <button
                  type="button"
                  onClick={() => toggleStudent(student.email)}
                  className={cn(
                    'w-full flex items-center gap-3.5 px-3.5 py-3 rounded-md text-left text-ink-strong transition-colors cursor-pointer',
                    isExpanded ? 'bg-paper-tinted' : 'bg-transparent hover:bg-paper-tinted',
                  )}
                >
                  <ChevronRight
                    size={14}
                    className={cn(
                      'text-ink-subtle transition-transform shrink-0',
                      isExpanded && 'rotate-90',
                    )}
                  />
                  <span
                    className={cn(
                      'w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 text-white text-xs font-bold',
                      avatarColor,
                    )}
                  >
                    {initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-semibold truncate">{student.name || student.email}</div>
                    {student.name && (
                      <div className="text-[12.5px] text-ink-subtle truncate">{student.email}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-20 h-1.5 bg-paper-deeper rounded-full overflow-hidden">
                      <div
                        className={cn('h-full', progressColor)}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        'font-mono text-[13.5px] font-medium tabular-nums min-w-[40px] text-right',
                        labelColor,
                      )}
                    >
                      {passed}/{total}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mx-9 mb-3.5 border border-rule-soft rounded-md overflow-hidden bg-paper-elevated">
                    {loadingFiles ? (
                      <div className="p-4 body-sm">Loading files…</div>
                    ) : studentFiles.length === 0 ? (
                      <div className="p-4 body-sm">No files found.</div>
                    ) : (
                      <div
                        className="flex"
                        style={{
                          height: selectedFile || showTestOutput ? '360px' : 'auto',
                        }}
                      >
                        <div
                          className={cn(
                            'overflow-y-auto flex-shrink-0',
                            selectedFile || showTestOutput ? 'w-52 border-r border-rule-soft' : 'w-full',
                          )}
                        >
                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                onClick={() => runStudentTests(student.email)}
                                disabled={testRunning}
                                className={cn(
                                  'w-full text-left px-3.5 py-2 text-sm truncate transition-colors flex items-center gap-2 cursor-pointer',
                                  showTestOutput
                                    ? 'bg-plum-soft text-plum'
                                    : 'text-plum hover:bg-plum-soft/60',
                                  'disabled:opacity-50',
                                )}
                              >
                                {testRunning ? (
                                  <RefreshCw size={12} className="flex-shrink-0 animate-spin" />
                                ) : (
                                  <FlaskConical size={12} className="flex-shrink-0" />
                                )}
                                <span className="truncate font-semibold">
                                  {testRunning ? 'Running…' : 'View test output'}
                                </span>
                              </button>
                              <div className="border-b border-rule-soft" />
                            </>
                          )}
                          {studentFiles.map((f) => {
                            const active = selectedFile === f && !showTestOutput;
                            return (
                              <button
                                key={f}
                                type="button"
                                onClick={() => {
                                  setShowTestOutput(false);
                                  viewFile(f);
                                }}
                                className={cn(
                                  'w-full text-left px-3.5 py-2 text-sm truncate transition-colors flex items-center gap-2 cursor-pointer',
                                  active
                                    ? 'bg-paper-tinted text-ink-strong'
                                    : 'text-ink-default hover:bg-paper-tinted',
                                )}
                                title={f}
                              >
                                <FileText size={12} className="flex-shrink-0 text-ink-subtle" />
                                <span className="truncate font-mono text-[12.5px]">{f}</span>
                              </button>
                            );
                          })}
                        </div>

                        {showTestOutput && (
                          <div className="flex-1 flex flex-col min-w-0">
                            <div className="flex items-center justify-between px-3.5 py-2 border-b border-rule-soft flex-shrink-0">
                              <span className="text-[12.5px] text-ink-muted">
                                Test output
                                {testResult && (
                                  <span
                                    className={cn(
                                      'ml-2 font-mono',
                                      testResult.total > 0 && testResult.passed === testResult.total
                                        ? 'text-forest'
                                        : 'text-ink-default',
                                    )}
                                  >
                                    {testResult.passed}/{testResult.total} passed
                                  </span>
                                )}
                              </span>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() => runStudentTests(student.email)}
                                  disabled={testRunning}
                                  className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1 text-xs cursor-pointer transition-colors disabled:opacity-50"
                                >
                                  <RefreshCw size={11} className={testRunning ? 'animate-spin' : ''} />
                                Re-run
                                </button>
                              )}
                            </div>
                            <div className="flex-1 min-h-0 overflow-auto p-3 bg-paper">
                              {testRunning && !testOutput ? (
                                <div className="body-sm">Running tests…</div>
                              ) : testOutput ? (
                                <pre className="whitespace-pre-wrap text-ink-default text-xs leading-relaxed font-mono">
                                  {testOutput}
                                </pre>
                              ) : (
                                <div className="body-sm">Click "View test output" to run tests.</div>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedFile && !showTestOutput && (
                          <div className="flex-1 flex flex-col min-w-0">
                            <div className="flex items-center justify-between px-3.5 py-2 border-b border-rule-soft flex-shrink-0">
                              <span className="text-[12.5px] text-ink-muted font-mono truncate">{selectedFile}</span>
                              {!readOnly && (
                                <Link
                                  to={`/ide?classroom=${classroomId}&student=${encodeURIComponent(student.email)}&file=${encodeURIComponent(selectedTemplate + '/' + selectedFile)}`}
                                  className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1.5 text-xs no-underline shrink-0 ml-3 transition-colors"
                                >
                                  <ExternalLink size={11} />
                                Open in workspace
                                </Link>
                              )}
                            </div>
                            <div className="flex-1 min-h-0 bg-paper p-3 font-mono text-[12.5px] leading-5">
                              {loadingContent ? (
                                <div className="body-sm">Loading…</div>
                              ) : (
                                <MonacoEditor
                                  height="100%"
                                  language={getMonacoLanguage(selectedFile)}
                                  value={fileContent ?? ''}
                                  beforeMount={setupDaylightTheme}
                                  theme={DAYLIGHT_THEME}
                                  options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    wordWrap: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    lineNumbers: 'on',
                                    renderWhitespace: 'selection',
                                    bracketPairColorization: { enabled: true },
                                    padding: { top: 8 },
                                    domReadOnly: true,
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gradebook Tab
// ---------------------------------------------------------------------------

const GRADING_MODES: { value: GradingMode; label: string }[] = [
  { value: 'equal', label: 'Equal weights' },
  { value: 'weighted', label: 'Custom weights' },
  { value: 'manual', label: 'Manual scores' },
];

function GradebookTab({
  apiBase,
  readOnly,
  progress,
  weights,
  onSaveWeights,
  onRunTests,
  runningTests,
}: {
  apiBase: string;
  readOnly: boolean;
  progress: ProgressData | null;
  weights: WeightsData | null;
  onSaveWeights: (w: WeightsData) => void;
  onRunTests: (t?: string) => void;
  runningTests: boolean;
}) {
  const [localMode, setLocalMode] = useState<GradingMode>(weights?.grading_mode ?? 'equal');
  const [localWeights, setLocalWeights] = useState<Record<string, number>>(weights?.weights ?? {});
  const [manualScores, setManualScores] = useState<ManualScores>({});
  const [manualScoresLoaded, setManualScoresLoaded] = useState(false);

  useEffect(() => {
    if (weights) {
      setLocalMode(weights.grading_mode);
      setLocalWeights(weights.weights);
    }
  }, [weights]);

  // Fetch manual scores when mode is manual
  useEffect(() => {
    if (localMode !== 'manual' || manualScoresLoaded) return;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/manual-scores`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setManualScores(data.scores ?? {});
        }
      } catch { /* ignore */ }
      setManualScoresLoaded(true);
    })();
  }, [localMode, apiBase, manualScoresLoaded]);

  if (!progress || progress.templates.length === 0) {
    return (
      <div className="bg-paper-elevated border border-rule-soft rounded-xl shadow-sm p-10 text-center body-sm">
        No assignments yet.
      </div>
    );
  }

  const templates = progress.templates;
  const showInputRow = localMode !== 'equal';

  const changeMode = (mode: GradingMode) => {
    if (readOnly) return;
    setLocalMode(mode);
    if (mode === 'equal') {
      // Only save the mode — don't touch stored weights so they're
      // preserved if the teacher switches back.
      onSaveWeights({ grading_mode: mode, weights: {} });
    } else {
      const newWeights = { ...localWeights };
      for (const t of templates) {
        if (!(t in newWeights)) newWeights[t] = 100;
      }
      setLocalWeights(newWeights);
      onSaveWeights({ grading_mode: mode, weights: newWeights });
    }
  };

  const updateWeight = (template: string, value: number) => {
    if (readOnly) return;
    const updated = { ...localWeights, [template]: value };
    setLocalWeights(updated);
    onSaveWeights({ grading_mode: localMode, weights: updated });
  };

  const saveManualScore = async (userId: string, template: string, score: number) => {
    if (readOnly) return;
    setManualScores((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [template]: score },
    }));
    await fetch(`${apiBase}/manual-score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user_id: userId, template_name: template, score }),
    });
  };

  const getWeightedAverage = (student: Student): string => {
    if (localMode === 'manual') {
      let totalPoints = 0;
      let earnedPoints = 0;
      for (const t of templates) {
        const total = localWeights[t] ?? 0;
        if (total === 0) continue;
        const score = manualScores[student.id]?.[t] ?? 0;
        totalPoints += total;
        earnedPoints += score;
      }
      if (totalPoints === 0) return '—';
      return `${Math.round((earnedPoints / totalPoints) * 100)}%`;
    }

    let totalWeight = 0;
    let weightedSum = 0;
    for (const t of templates) {
      const w = localMode === 'equal' ? 1 : (localWeights[t] ?? 0);
      const result = student.results[t];
      if (!result || result.total === 0) continue;
      totalWeight += w;
      weightedSum += w * (result.passed / result.total);
    }
    if (totalWeight === 0) return '—';
    return `${Math.round((weightedSum / totalWeight) * 100)}%`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        {/* Mode selector */}
        <div
          role="tablist"
          aria-label="Grading mode"
          className="inline-flex items-center bg-paper-elevated border border-rule-soft rounded-full p-1"
        >
          {GRADING_MODES.map((m) => {
            const active = m.value === localMode;
            return (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeMode(m.value)}
                disabled={readOnly && !active}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap',
                  active
                    ? 'bg-navy text-white'
                    : 'text-ink-muted hover:text-ink-strong',
                  readOnly && !active ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {localMode !== 'manual' && !readOnly && (
          <div className="flex items-center gap-3">
            <span className="caption">Scores update when you run tests.</span>
            <button
              type="button"
              onClick={() => onRunTests()}
              disabled={runningTests}
              className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-paper-tinted text-sm cursor-pointer transition-colors disabled:opacity-50"
            >
              {runningTests ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {runningTests ? 'Running…' : 'Run all tests'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-paper-elevated border border-rule-soft rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-rule-soft">
              <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted min-w-[180px]">
                Student
              </th>
              {templates.map((t) => (
                <th
                  key={t}
                  className="pl-3! pr-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-ink-muted min-w-[110px]"
                >
                  <div className="truncate max-w-[140px] mx-auto normal-case tracking-normal" title={t}>
                    {t}
                  </div>
                </th>
              ))}
              {localMode === 'manual' && (
                <th className="pl-3! pr-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-ink-muted min-w-[90px]">
                  Total
                </th>
              )}
              <th className="pl-3! pr-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-ink-muted min-w-[90px]">
                Average
              </th>
            </tr>
            {showInputRow && (
              <tr className="border-b border-rule-soft bg-paper-tinted/50">
                <th className="pl-3! pr-3 py-2 text-left text-[11px] font-semibold text-ink-muted">
                  {localMode === 'manual' ? 'Total points' : 'Weights'}
                </th>
                {templates.map((t) => (
                  <th key={t} className="pl-3! pr-3 py-2 text-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={localWeights[t] ?? 0}
                      readOnly={readOnly}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d*$/.test(v)) {
                          updateWeight(t, parseFloat(v) || 0);
                        }
                      }}
                      className={cn(
                        'bg-paper border border-rule rounded-md text-sm text-ink-default px-2 py-1 w-20 text-center font-mono outline-none focus:ring-2 focus:ring-navy/30 transition-shadow',
                        readOnly && 'cursor-not-allowed',
                      )}
                      title={`${localMode === 'manual' ? 'Total' : 'Weight'} for ${t}`}
                    />
                  </th>
                ))}
                {localMode === 'manual' && <th className="pl-3! pr-3 py-2" />}
                <th className="pl-3! pr-3 py-2" />
              </tr>
            )}
          </thead>
          <tbody>
            {progress.students.length === 0 ? (
              <tr>
                <td
                  colSpan={templates.length + (localMode === 'manual' ? 3 : 2)}
                  className="pl-3! pr-3 py-10 text-center body-sm"
                >
                  No students have joined yet.
                </td>
              </tr>
            ) : (
              progress.students.map((student) => (
                <tr key={student.id} className="border-t border-rule-soft hover:bg-paper-tinted transition-colors">
                  <td className="pl-3! pr-3 py-2.5 text-sm text-ink-default">
                    <div className="truncate max-w-[200px] font-semibold text-ink-strong">
                      {student.name || student.email}
                    </div>
                  </td>
                  {templates.map((t) => {
                    if (localMode === 'manual') {
                      const score = manualScores[student.id]?.[t] ?? 0;
                      const total = localWeights[t] ?? 0;
                      return (
                        <td key={t} className="pl-3! pr-3 py-2 text-center">
                          <div className="inline-flex items-center gap-1 font-mono text-xs tabular-nums">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={score}
                              readOnly={readOnly}
                              onChange={(e) => {
                                if (readOnly) return;
                                const v = e.target.value;
                                if (v === '' || /^\d*\.?\d*$/.test(v)) {
                                  const num = parseFloat(v) || 0;
                                  setManualScores((prev) => ({
                                    ...prev,
                                    [student.id]: { ...prev[student.id], [t]: num },
                                  }));
                                }
                              }}
                              onBlur={() => {
                                saveManualScore(student.id, t, manualScores[student.id]?.[t] ?? 0);
                              }}
                              className={cn(
                                'bg-paper border border-rule rounded-md text-sm px-2 py-1 w-14 text-center font-mono tabular-nums outline-none focus:ring-2 focus:ring-navy/30 transition-shadow',
                                total > 0 && score >= total ? 'text-forest font-semibold' : 'text-ink-default',
                                readOnly && 'cursor-not-allowed',
                              )}
                            />
                            <span className="text-ink-subtle">/{total || 0}</span>
                          </div>
                        </td>
                      );
                    }
                    const r = student.results[t];
                    const passed = r?.passed ?? 0;
                    const total = r?.total ?? 0;
                    const passing = total > 0 && passed === total;
                    const partial = passed > 0 && passed < total;
                    // Plain colored numbers (no pill background): full pass
                    // → forest, partial → ochre, zero → tomato. Mirrors the
                    // Students-tab treatment for consistency.
                    const labelColor = passing
                      ? 'text-forest'
                      : partial
                        ? 'text-ochre'
                        : 'text-tomato';
                    return (
                      <td key={t} className="pl-3! pr-3 py-2.5 text-center">
                        {total === 0 ? (
                          <span className="font-mono text-xs text-ink-subtle">—</span>
                        ) : (
                          <span
                            className={cn(
                              'font-mono tabular-nums text-sm font-semibold',
                              labelColor,
                            )}
                          >
                            {passed}/{total}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {localMode === 'manual' && (() => {
                    let earned = 0;
                    let possible = 0;
                    for (const t of templates) {
                      const total = localWeights[t] ?? 0;
                      const score = manualScores[student.id]?.[t] ?? 0;
                      earned += score;
                      possible += total;
                    }
                    return (
                      <td className="pl-3! pr-3 py-2.5 text-center">
                        <span
                          className={cn(
                            'font-mono text-sm tabular-nums',
                            possible > 0 && earned >= possible ? 'text-forest font-semibold' : 'text-ink-default',
                          )}
                        >
                          {earned}/{possible}
                        </span>
                      </td>
                    );
                  })()}
                  <td className="pl-3! pr-3 py-2.5 text-center">
                    <span className="font-mono text-sm tabular-nums font-semibold text-ink-strong">
                      {getWeightedAverage(student)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assignments Tab
// ---------------------------------------------------------------------------

interface Draft {
  name: string;
  files: string[];
}

function AssignmentsTab({
  classroomId,
  apiBase,
  readOnly,
  isInstructor,
  templates,
  onPublished,
}: {
  classroomId: string;
  apiBase: string;
  readOnly: boolean;
  isInstructor: boolean;
  templates: string[];
  onPublished: () => Promise<void> | void;
}) {
  const userData = useContext(UserDataContext);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [renamingDraft, setRenamingDraft] = useState<string | null>(null);
  const [renameDraftValue, setRenameDraftValue] = useState<string>('');
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchDrafts = useCallback(async () => {
    if (!isInstructor) {
      // /drafts is instructor-only; participants don't have drafts to see.
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${apiBase}/drafts`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, isInstructor]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const handleUpload = async (fileList: FileList) => {
    if (fileList.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of Array.from(fileList)) {
        const path = (file as { webkitRelativePath?: string }).webkitRelativePath || file.name;
        formData.append('files', file, path);
      }
      const res = await fetch(`${apiBase}/drafts`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text();
        alert(text || 'Upload failed');
      }
      await Promise.all([fetchDrafts(), userData.refreshFiles()]);
    } finally {
      setUploading(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const startRenameDraft = (oldName: string) => {
    setRenamingDraft(oldName);
    setRenameDraftValue(oldName);
  };

  const cancelRenameDraft = () => {
    setRenamingDraft(null);
    setRenameDraftValue('');
  };

  const commitRenameDraft = async (oldName: string) => {
    const next = renameDraftValue.trim();
    if (!next || next === oldName) {
      cancelRenameDraft();
      return;
    }
    const res = await fetch(
      `${apiBase}/drafts/${encodeURIComponent(oldName)}/rename`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_name: next }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      let msg = body;
      try {
        const parsed = JSON.parse(body);
        msg = parsed.detail ?? parsed.error ?? body;
      } catch { /* not JSON */ }
      alert(msg || 'Rename failed');
      return;
    }
    cancelRenameDraft();
    await Promise.all([fetchDrafts(), userData.refreshFiles()]);
  };

  const deleteDraft = async (name: string) => {
    if (!window.confirm(`Delete draft "${name}"?`)) return;
    await fetch(`${apiBase}/drafts/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await Promise.all([fetchDrafts(), userData.refreshFiles()]);
  };

  const deleteAssignment = async (name: string) => {
    if (!window.confirm(`Delete published assignment "${name}"? This will not remove copies already in students' folders.`)) return;
    await fetch(`${apiBase}/assignments/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await Promise.all([Promise.resolve(onPublished()), userData.refreshFiles()]);
  };

  const publishDraft = async (name: string) => {
    setPublishing(name);
    try {
      const res = await fetch(`${apiBase}/drafts/${encodeURIComponent(name)}/publish`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.text();
        let message = body;
        try {
          const parsed = JSON.parse(body);
          message = parsed.detail ?? parsed.error ?? body;
        } catch {
          // not JSON — use raw body
        }
        alert(message || 'Publish failed');
        return;
      }
      // Wait for all refreshes before clearing the spinner so the UI reflects
      // the new state atomically — otherwise the teacher may see the draft and
      // published assignment side-by-side while fetchProgress is still in flight.
      await Promise.all([
        Promise.resolve(onPublished()),
        fetchDrafts(),
        userData.refreshFiles(),
      ]);
    } finally {
      setPublishing(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
        <div>
          <h3 className="heading-3">Assignments</h3>
          <p className="body-sm mt-1">
            {!isInstructor
              ? 'Assignments published to this classroom.'
              : readOnly ? 'Published templates for this classroom.' : 'Drafts and published templates for this classroom.'}
          </p>
        </div>
        {!readOnly && isInstructor && (
          <div className="flex items-center gap-2">
            <Link
              to="/lessons"
              className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-paper-tinted text-sm no-underline transition-colors"
              title="Browse ready-to-import lessons"
            >
              <BookOpen size={14} />
            Browse lessons
            </Link>
            <PrimaryButton
              size="sm"
              color="navy"
              icon={<Upload size={14} />}
              onClick={() => folderInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload assignment'}
            </PrimaryButton>
            <input
              ref={folderInputRef}
              type="file"
              className="hidden"
              {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
              disabled={uploading}
            />
          </div>
        )}
      </div>

      {/* Drafts (instructor-only) */}
      {isInstructor && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="eyebrow text-ochre">Drafts</span>
            <span className="caption">Edit and preview before publishing.</span>
          </div>
          {drafts.length === 0 ? (
            <div className="bg-paper-elevated border border-rule-soft rounded-lg shadow-sm p-6 text-center body-sm">
          No drafts. Upload a folder above to create one.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {drafts.map((draft) => (
                <div
                  key={draft.name}
                  className="bg-paper-elevated border border-rule-soft rounded-lg p-5 shadow-sm flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {renamingDraft === draft.name && !readOnly ? (
                        <input
                          autoFocus
                          value={renameDraftValue}
                          onChange={(e) => setRenameDraftValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitRenameDraft(draft.name);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelRenameDraft();
                            }
                          }}
                          onBlur={() => commitRenameDraft(draft.name)}
                          onFocus={(e) => e.currentTarget.select()}
                          className="bg-paper border border-rule rounded-md px-3 py-1.5 text-ink-strong text-base font-semibold outline-none focus:ring-2 focus:ring-navy/30 w-full"
                        />
                      ) : (
                        <>
                          <p className="heading-4 truncate mb-0">{draft.name}</p>
                          <Pill color="ochre">Draft</Pill>
                        </>
                      )}
                    </div>
                    <p className="body-sm mt-1">
                      {draft.files.length} {draft.files.length === 1 ? 'file' : 'files'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {readOnly ? (
                      <span
                        className="text-ink-muted inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm cursor-not-allowed opacity-60"
                        title="Sign up to edit drafts in your own workspace."
                      >
                        <ExternalLink size={14} />
                      Edit in workspace
                      </span>
                    ) : (
                      <Link
                        to={`/ide?classroom=${classroomId}&folder=${encodeURIComponent('drafts/' + draft.name)}`}
                        className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-paper-tinted text-sm no-underline transition-colors"
                        title="Open in workspace to edit"
                      >
                        <ExternalLink size={14} />
                    Edit in workspace
                      </Link>
                    )}
                    <PrimaryButton
                      size="sm"
                      color="forest"
                      icon={<Send size={14} />}
                      onClick={() => { if (!readOnly) publishDraft(draft.name); }}
                      disabled={readOnly || publishing === draft.name || renamingDraft === draft.name}
                      title={readOnly ? 'Sign up to publish drafts.' : undefined}
                    >
                      {publishing === draft.name ? 'Publishing…' : 'Publish'}
                    </PrimaryButton>
                    <button
                      type="button"
                      onClick={() => { if (!readOnly) startRenameDraft(draft.name); }}
                      disabled={readOnly}
                      className={cn(
                        'p-2 rounded-md text-ink-muted transition-colors',
                        readOnly ? 'opacity-60 cursor-not-allowed' : 'hover:text-ink-strong hover:bg-paper-tinted cursor-pointer',
                      )}
                      title={readOnly ? 'Sign up to rename drafts.' : 'Rename draft'}
                      aria-label="Rename draft"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { if (!readOnly) deleteDraft(draft.name); }}
                      disabled={readOnly}
                      className={cn(
                        'p-2 rounded-md text-tomato transition-colors',
                        readOnly ? 'opacity-60 cursor-not-allowed' : 'hover:bg-tomato/10 cursor-pointer',
                      )}
                      title={readOnly ? 'Sign up to delete drafts.' : 'Delete draft'}
                      aria-label="Delete draft"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Published */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="eyebrow text-forest">Published</span>
          <span className="caption">{isInstructor ? 'Distributed to students.' : 'Available in your classroom folder.'}</span>
        </div>
        {templates.length === 0 && drafts.length === 0 ? (
          <div className="bg-paper-elevated border border-rule-soft rounded-lg shadow-sm p-6 text-center body-sm">
            {isInstructor
              ? 'No assignments yet. Upload a folder to create a draft, then publish it to distribute to students.'
              : 'No assignments yet. Your teacher will publish them here.'}
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-paper-elevated border border-rule-soft rounded-lg shadow-sm p-6 text-center body-sm">
            No published assignments yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {templates.map((t) => (
              <div
                key={t}
                className="bg-paper-elevated border border-rule-soft rounded-lg p-5 shadow-sm flex items-start justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText size={16} className="text-forest shrink-0" />
                  <p className="heading-4 truncate mb-0">{t}</p>
                  <Pill color="forest">Published</Pill>
                </div>
                {!readOnly && isInstructor && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => deleteAssignment(t)}
                      className="p-2 rounded-md text-tomato hover:bg-tomato/10 cursor-pointer transition-colors"
                      title="Delete assignment"
                      aria-label="Delete assignment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="text-center py-8 body-sm">Loading…</div>}
    </div>
  );
}
