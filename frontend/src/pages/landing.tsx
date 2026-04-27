import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowRight,
  BookOpen,
  Heart,
  Terminal,
  Globe,
  FlaskConical,
  Users,
  LayoutTemplate,
  Code,
  Share2,
  UserPlus,
  Laptop,
  Send,
  Server,
  Zap,
  ChevronRight,
  FileText,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import { PrimaryButton, GhostButton, Pill } from '../components/ui/Buttons';
import { SpotEditor, SpotGradebook } from '../components/ui/Spots';
import TerminalDemo from '../components/TerminalDemo';
import Footer from '../components/Footer';
import { cn } from '../util/cn';

type AccentColor = 'navy' | 'tomato' | 'ochre' | 'forest' | 'plum';

const ACCENT_BG_SOFT: Record<AccentColor, string> = {
  navy: 'bg-navy-soft text-navy',
  tomato: 'bg-tomato-soft text-tomato',
  ochre: 'bg-ochre-soft text-ochre',
  forest: 'bg-forest-soft text-forest',
  plum: 'bg-plum-soft text-plum',
};

interface FeatureCell {
  icon: React.ReactNode;
  color: AccentColor;
  title: string;
  body: string;
}

const FEATURES: FeatureCell[] = [
  {
    icon: <Terminal size={22} />,
    color: 'navy',
    title: 'A real Python workspace',
    body: 'A persistent Linux environment with editor, file explorer, and terminal.',
  },
  {
    icon: <Globe size={22} />,
    color: 'forest',
    title: 'Public web addresses',
    body: 'Run any server and publish to name.app.3compute.org. Share with classmates or family.',
  },
  {
    icon: <FlaskConical size={22} />,
    color: 'plum',
    title: 'Auto-graded tests',
    body: 'Lessons ship with tests. Students see what\'s passing as they work; teachers see the same view in the gradebook.',
  },
  {
    icon: <BookOpen size={22} />,
    color: 'ochre',
    title: 'An open lesson library',
    body: 'Modify any community lesson, or write your own using Markdown plus a tests directory.',
  },
  {
    icon: <Users size={22} />,
    color: 'tomato',
    title: 'Classroom management',
    body: 'Create a classroom, share an access code, and students join with one click. See everyone\'s work in one place.',
  },
  {
    icon: <LayoutTemplate size={22} />,
    color: 'ochre',
    title: 'Import, modify, or write lessons',
    body: 'Pull from the open library, adapt a lesson to your class, or write a new one from scratch.',
  },
];

// ---------------------------------------------------------------------------
// Lightweight Python tokenizer (for ClassroomDemo's static code preview)
// ---------------------------------------------------------------------------

type TokenType = 'keyword' | 'string' | 'number' | 'comment' | 'decorator' | 'ident' | 'other';

const PY_KEYWORDS = new Set([
  'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'import',
  'from', 'as', 'class', 'True', 'False', 'None', 'and', 'or', 'not',
  'is', 'with', 'try', 'except', 'finally', 'raise', 'pass', 'break',
  'continue', 'lambda', 'yield', 'global', 'nonlocal', 'print', 'int',
  'str', 'float', 'list', 'dict', 'tuple', 'range', 'input', 'len',
]);

const TOKEN_VAR: Record<TokenType, string> = {
  keyword: 'var(--code-keyword)',
  string: 'var(--code-string)',
  number: 'var(--code-number)',
  comment: 'var(--code-comment)',
  decorator: 'var(--code-decorator)',
  ident: 'var(--code-ident)',
  other: 'var(--code-other)',
};

function tokenizePython(line: string): { t: TokenType; v: string }[] {
  const out: { t: TokenType; v: string }[] = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === '#') { out.push({ t: 'comment', v: line.slice(i) }); break; }
    if ((c === 'f' || c === 'F') && (line[i + 1] === '"' || line[i + 1] === '\'')) {
      const q = line[i + 1]; let j = i + 2;
      while (j < line.length && line[j] !== q) j++;
      out.push({ t: 'string', v: line.slice(i, j + 1) }); i = j + 1; continue;
    }
    if (c === '"' || c === '\'') {
      const q = c; let j = i + 1;
      while (j < line.length && line[j] !== q) j++;
      out.push({ t: 'string', v: line.slice(i, j + 1) }); i = j + 1; continue;
    }
    if (/\d/.test(c)) {
      let j = i; while (j < line.length && /[\d.]/.test(line[j])) j++;
      out.push({ t: 'number', v: line.slice(i, j) }); i = j; continue;
    }
    if (c === '@') {
      let j = i + 1; while (j < line.length && /[\w.]/.test(line[j])) j++;
      out.push({ t: 'decorator', v: line.slice(i, j) }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < line.length && /\w/.test(line[j])) j++;
      const word = line.slice(i, j);
      out.push({ t: PY_KEYWORDS.has(word) ? 'keyword' : 'ident', v: word });
      i = j; continue;
    }
    let j = i; while (j < line.length && !/[\w@'"#\d\s]/.test(line[j])) j++;
    out.push({ t: 'other', v: line.slice(i, Math.max(j, i + 1)) });
    i = Math.max(j, i + 1);
  }
  return out;
}

function PyLine({ line, lineNo }: { line: string; lineNo: number }) {
  return (
    <div className="flex gap-3">
      <span
        className="select-none text-right text-xs"
        style={{ color: 'var(--ink-faint)', minWidth: 22 }}
      >
        {lineNo}
      </span>
      <span className="whitespace-pre">
        {line === '' ? ' ' : tokenizePython(line).map((tok, j) => (
          <span key={j} style={{ color: TOKEN_VAR[tok.t] }}>{tok.v}</span>
        ))}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Classroom demo data & component (restored from original, reskinned)
// ---------------------------------------------------------------------------

interface DemoStudent {
  name: string;
  email: string;
  scores: Record<string, [number, number]>;
}

const DEMO_STUDENTS: DemoStudent[] = [
  { name: 'Alice Chen', email: 'alice@school.edu', scores: { 'Data-Encoding': [7, 8], 'Tic-Tac-Toe': [3, 4], 'Weather-App': [2, 3] } },
  { name: 'Ben Torres', email: 'ben@school.edu', scores: { 'Data-Encoding': [6, 8], 'Tic-Tac-Toe': [4, 4], 'Weather-App': [3, 3] } },
  { name: 'Chloe Park', email: 'chloe@school.edu', scores: { 'Data-Encoding': [8, 8], 'Tic-Tac-Toe': [4, 4], 'Weather-App': [3, 3] } },
  { name: 'David Kim', email: 'david@school.edu', scores: { 'Data-Encoding': [5, 8], 'Tic-Tac-Toe': [2, 4], 'Weather-App': [1, 3] } },
  { name: 'Emma Davis', email: 'emma@school.edu', scores: { 'Data-Encoding': [7, 8], 'Tic-Tac-Toe': [4, 4], 'Weather-App': [2, 3] } },
];

const DEMO_TEMPLATES = ['Data-Encoding', 'Tic-Tac-Toe', 'Weather-App'];

const DEMO_AVATAR_COLORS = ['bg-tomato', 'bg-navy', 'bg-forest', 'bg-ochre', 'bg-plum'];

function demoInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function DemoStudentRow({
  student,
  idx,
  p,
  t,
  expanded = false,
}: {
  student: DemoStudent;
  idx: number;
  p: number;
  t: number;
  expanded?: boolean;
}) {
  const passing = p === t;
  const partial = p > 0 && p < t;
  const avatarBg = DEMO_AVATAR_COLORS[idx % DEMO_AVATAR_COLORS.length];
  return (
    <div
      className={cn(
        'w-full flex items-center gap-3.5 px-3.5 py-3 rounded-md transition-colors',
        expanded ? 'bg-paper-tinted' : 'hover:bg-paper-tinted',
      )}
    >
      <span
        className={cn(
          'text-ink-subtle inline-flex transition-transform shrink-0',
          expanded && 'rotate-90',
        )}
      >
        <ChevronRight size={14} />
      </span>
      <span
        className={cn(
          'w-8 h-8 rounded-full inline-flex items-center justify-center text-white text-xs font-bold shrink-0',
          avatarBg,
        )}
      >
        {demoInitials(student.name)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-semibold text-ink-strong truncate">{student.name}</div>
        <div className="text-[12.5px] text-ink-subtle truncate">{student.email}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-20 h-1.5 bg-paper-deeper rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full',
              passing ? 'bg-forest' : partial ? 'bg-ochre' : 'bg-tomato',
            )}
            style={{ width: `${(p / t) * 100}%` }}
          />
        </div>
        <span
          className={cn(
            'font-mono text-sm tabular-nums min-w-[36px] text-right',
            passing ? 'text-forest font-semibold' : 'text-ink-default',
          )}
        >
          {p}/{t}
        </span>
      </div>
    </div>
  );
}

const DEMO_TEST_OUTPUT = `Running tests for Data-Encoding...

test_hex_encode .......... PASSED
test_hex_decode .......... PASSED
test_base64_encode ....... PASSED
test_base64_decode ....... PASSED
test_caesar_encrypt ...... PASSED
test_caesar_decrypt ...... PASSED
test_binary_encode ....... FAILED
  Expected: '01001000 01101001'
  Got:      '1001000 1101001'
test_binary_decode ....... PASSED

7/8 tests passed`;

const DEMO_CODE = `def hex_encode(text):
    return ' '.join(format(ord(c), '02x') for c in text)

def hex_decode(hex_str):
    bytes_list = hex_str.strip().split()
    return ''.join(chr(int(b, 16)) for b in bytes_list)

def binary_encode(text):
    return ' '.join(format(ord(c), 'b') for c in text)
    #        should be '08b' ^  missing zero-pad!`;

function ClassroomDemo() {
  const [step, setStep] = useState(0);
  const studentsTabRef = useRef<HTMLDivElement | null>(null);
  const [panelHeight, setPanelHeight] = useState<number | undefined>(undefined);

  // Lock the mock-UI panel to the height of the Students tab (the first step
  // shown on mount) so switching steps doesn't make the card grow or shrink —
  // longer steps scroll inside instead.
  useEffect(() => {
    if (step === 0 && studentsTabRef.current && panelHeight === undefined) {
      setPanelHeight(studentsTabRef.current.scrollHeight);
    }
  }, [step, panelHeight]);

  const steps = [
    { label: 'Students tab', desc: 'See every student and their test scores at a glance.' },
    { label: 'Drill into student', desc: 'Expand a student to view their files and code.' },
    { label: 'Run tests', desc: 'Run tests against a student\'s code and read detailed output.' },
    { label: 'Gradebook', desc: 'Track all scores in a spreadsheet-style view with flexible grading.' },
  ];

  return (
    <div className="rounded-2xl border border-rule-soft bg-paper-elevated overflow-hidden shadow-md">
      <div className="px-8 pt-8 pb-4 text-center">
        <span className="eyebrow text-tomato block mb-2">Inside the gradebook</span>
        <h3 className="heading-2">Track every student&rsquo;s progress</h3>
        <p className="body text-ink-muted max-w-lg mx-auto">
          See scores, drill into code, run tests, and manage grades — all in one classroom view.
        </p>
      </div>

      {/* Step pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4 px-4">
        {steps.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ' +
              (step === i
                ? 'bg-tomato-soft text-tomato'
                : 'text-ink-muted hover:text-ink-default hover:bg-paper-tinted')
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Mock UI panels — locked to the Students-tab height; scroll for taller steps. */}
      <div
        className={cn(
          'mx-4 mb-4 rounded-xl border border-rule bg-paper-tinted',
          step === 0 ? 'overflow-hidden' : 'overflow-y-auto',
        )}
        style={{ height: panelHeight }}
      >
        {step === 0 && (
          <div ref={studentsTabRef} className="p-4">
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="px-3 py-1.5 rounded-md bg-paper-elevated border border-rule-soft text-ink-strong text-sm font-medium">Data-Encoding</span>
              <span className="px-3 py-1.5 rounded-md text-ink-muted text-sm">Tic-Tac-Toe</span>
              <span className="px-3 py-1.5 rounded-md text-ink-muted text-sm">Weather-App</span>
            </div>
            {DEMO_STUDENTS.map((s, i) => {
              const [p, t] = s.scores['Data-Encoding'];
              return (
                <DemoStudentRow key={s.email} student={s} idx={i} p={p} t={t} />
              );
            })}
          </div>
        )}

        {(step === 1 || step === 2) && (
          <div className="p-4">
            {/* Assignment selector */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="px-3 py-1.5 rounded-md bg-paper-elevated border border-rule-soft text-ink-strong text-sm font-medium">Data-Encoding</span>
              <span className="px-3 py-1.5 rounded-md text-ink-muted text-sm">Tic-Tac-Toe</span>
              <span className="px-3 py-1.5 rounded-md text-ink-muted text-sm">Weather-App</span>
            </div>
            {/* Alice expanded */}
            <DemoStudentRow
              student={DEMO_STUDENTS[0]}
              idx={0}
              p={DEMO_STUDENTS[0].scores['Data-Encoding'][0]}
              t={DEMO_STUDENTS[0].scores['Data-Encoding'][1]}
              expanded
            />
            <div className="ml-8 mr-3 mb-3 border border-rule-soft rounded-b-md overflow-hidden bg-paper-elevated">
              <div className="flex" style={{ height: 220 }}>
                <div className="w-48 border-r border-rule-soft overflow-y-auto flex-shrink-0 bg-paper-tinted">
                  <div className={
                    'px-3 py-1.5 text-sm flex items-center gap-2 ' +
                    (step === 2
                      ? 'bg-navy-soft text-navy font-semibold'
                      : 'text-navy')
                  }>
                    <FlaskConical size={12} className="flex-shrink-0" />
                    <span className="truncate">View test output</span>
                  </div>
                  <div className="border-b border-rule-soft" />
                  {['encoding.py', 'decode.py', 'test_encoding.py'].map((f, i) => (
                    <div key={f} className={
                      'px-3 py-1.5 text-sm flex items-center gap-2 ' +
                      (step === 1 && i === 0
                        ? 'bg-paper-elevated text-ink-strong font-semibold'
                        : 'text-ink-muted')
                    }>
                      <FileText size={12} className="flex-shrink-0 opacity-60" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                  {step === 1 ? (
                    <>
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-rule-soft flex-shrink-0 bg-paper-tinted">
                        <span className="text-xs text-ink-muted font-mono truncate">encoding.py</span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-navy font-semibold shrink-0 ml-3">
                          <ExternalLink size={11} />
                          Open in workspace
                        </span>
                      </div>
                      <div className="flex-1 overflow-auto px-4 pt-3 pb-2 font-mono text-[12.5px] leading-6 bg-paper-elevated">
                        {DEMO_CODE.split('\n').map((line, i) => (
                          <PyLine key={i} line={line} lineNo={i + 1} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-rule-soft flex-shrink-0 bg-paper-tinted">
                        <span className="text-xs text-ink-muted">
                          Test output
                          <span className="ml-2 text-ink-strong font-semibold">7/8 passed</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-navy font-semibold shrink-0 ml-3">
                          <RefreshCw size={11} /> Re-run
                        </span>
                      </div>
                      <div className="flex-1 p-3 overflow-auto bg-paper-elevated">
                        <pre className="whitespace-pre-wrap text-ink-default text-xs leading-relaxed font-mono m-0">{DEMO_TEST_OUTPUT}</pre>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Remaining students collapsed */}
            {DEMO_STUDENTS.slice(1).map((s, i) => {
              const [p, t] = s.scores['Data-Encoding'];
              return (
                <DemoStudentRow key={s.email} student={s} idx={i + 1} p={p} t={t} />
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex rounded-md overflow-hidden border border-rule">
                <span className="px-3 py-1 text-xs bg-paper-elevated text-ink-strong font-semibold">Equal weights</span>
                <span className="px-3 py-1 text-xs text-ink-muted">Custom weights</span>
                <span className="px-3 py-1 text-xs text-ink-muted">Manual scores</span>
              </div>
            </div>
            <div className="overflow-x-auto rounded-md border border-rule-soft bg-paper-elevated">
              <table className="w-full text-sm" style={{ borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-paper-tinted">
                    <th style={{ padding: '8px 12px' }} className="text-left text-xs text-ink-muted font-semibold pl-3!">Student</th>
                    {DEMO_TEMPLATES.map((t) => (
                      <th key={t} style={{ padding: '8px 12px' }} className="text-xs text-ink-muted font-semibold text-center pl-3!">{t}</th>
                    ))}
                    <th style={{ padding: '8px 12px' }} className="text-xs text-ink-muted font-semibold text-center pl-3!">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_STUDENTS.map((s) => {
                    let totalW = 0;
                    let weightedS = 0;
                    for (const t of DEMO_TEMPLATES) {
                      const [p, tot] = s.scores[t];
                      if (tot > 0) { totalW += 1; weightedS += p / tot; }
                    }
                    const avg = totalW > 0 ? Math.round((weightedS / totalW) * 100) : 0;
                    return (
                      <tr key={s.email} className="border-t border-rule-soft">
                        <td style={{ padding: '8px 12px' }} className="text-sm text-ink-strong pl-3!">{s.name}</td>
                        {DEMO_TEMPLATES.map((t) => {
                          const [p, tot] = s.scores[t];
                          const passing = p === tot;
                          return (
                            <td key={t} style={{ padding: '8px 12px' }} className="text-center pl-3!">
                              <span className={`font-mono text-xs tabular-nums ${passing ? 'text-forest font-semibold' : 'text-ink-muted'}`}>
                                {p}/{tot}
                              </span>
                            </td>
                          );
                        })}
                        <td style={{ padding: '8px 12px' }} className="text-center pl-3!">
                          <span className="font-mono text-xs tabular-nums text-ink-strong font-semibold">{avg}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-6">
        <p className="body-sm m-0">{steps[step].desc}</p>
        <button
          type="button"
          onClick={() => setStep((s) => (s + 1) % steps.length)}
          className="flex items-center gap-1.5 text-xs font-semibold text-ink-default hover:text-navy transition-colors px-3 py-1.5 rounded-md border border-rule hover:border-navy cursor-pointer"
        >
          {steps[(step + 1) % steps.length].label}
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step row helper for the "How it works" section
// ---------------------------------------------------------------------------

function HowStep({
  number,
  icon,
  text,
  color,
}: {
  number: number;
  icon: React.ReactNode;
  text: string;
  color: AccentColor;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${ACCENT_BG_SOFT[color]} flex items-center justify-center text-sm font-semibold`}>
        {number}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <span className="text-ink-muted">{icon}</span>
        <span className="body text-ink-default">{text}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const userData = useContext(UserDataContext);
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Detect login state
  useEffect(() => {
    if (userData?.userInfo) {
      setIsLoggedIn(true);
    } else {
      fetch(`${apiUrl}/auth/me`, { credentials: 'include' })
        .then((r) => setIsLoggedIn(r.ok))
        .catch(() => setIsLoggedIn(false));
    }
  }, [userData?.userInfo]);

  // Re-enable page scrolling for the landing page (the rest of the app shell
  // sets overflow:hidden) and restore on unmount.
  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => {
      document.documentElement.style.overflowY = 'hidden';
    };
  }, []);

  function handleSignIn() {
    if (isLoggedIn) {
      navigate('/ide');
    } else {
      window.location.href = `${apiUrl}/auth/login`;
    }
  }

  function scrollToHowItWorks(e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="bg-paper">
      {/* ============================================================
          1. Hero
         ============================================================ */}
      <section className="relative overflow-hidden px-7 pt-[88px] pb-24">
        <div
          aria-hidden
          className="absolute top-[60px] -right-20 w-[280px] h-[280px] bg-ochre-soft rounded-full opacity-60 z-0"
        />
        <div
          aria-hidden
          className="absolute top-[220px] right-20 w-20 h-20 bg-tomato rounded-[18px] rotate-12 opacity-85 z-0"
        />

        <div className="max-w-[1180px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-14 items-center">
          <div>
            <h1
              className="heading-display mb-7"
              style={{ fontSize: 64, lineHeight: 1.05 }}
            >
              The coding classroom<br />
              <span className="text-navy italic">that stays with students</span>
            </h1>
            <p className="body-lg mb-8 max-w-[540px]">
              3Compute is a free coding environment for teachers and students. Create or import
              lessons, run Python in the browser, and watch as students build projects
              they keep.
            </p>
            <div className="flex flex-wrap gap-3">
              <PrimaryButton
                size="lg"
                color="navy"
                onClick={handleSignIn}
                icon={<ArrowRight size={18} />}
              >
                {isLoggedIn ? 'Go to dashboard' : 'Sign in with Google'}
              </PrimaryButton>
              <a
                href="#how-it-works"
                onClick={scrollToHowItWorks}
                className="inline-flex"
              >
                <GhostButton>How it works</GhostButton>
              </a>
              <Link to="/lessons" className="inline-flex">
                <GhostButton icon={<LayoutTemplate size={16} />}>
                  Browse lessons
                </GhostButton>
              </Link>
            </div>
          </div>
          <div className="lg:justify-self-end w-full">
            <TerminalDemo />
          </div>
        </div>
      </section>

      {/* ============================================================
          2. Mission band — navy
         ============================================================ */}
      <section id="mission" className="bg-navy px-7 py-[88px] relative overflow-hidden" style={{ color: '#fff' }}>
        <div
          aria-hidden
          className="absolute -top-10 -left-10 w-[180px] h-[180px] bg-tomato rounded-full opacity-40"
        />
        <div
          aria-hidden
          className="absolute -bottom-[60px] right-10 w-[120px] h-[120px] bg-ochre rounded-3xl opacity-50"
          style={{ transform: 'rotate(-18deg)' }}
        />
        <div className="max-w-[760px] mx-auto text-center relative">
          <div className="eyebrow mb-5" style={{ color: '#f4a948' }}>
            Why we built this
          </div>
          <h2 className="heading-2" style={{ color: '#fff' }}>
            Every classroom should have access
          </h2>
          <p className="body-lg" style={{ color: '#e8e1ce' }}>
            Computer science classrooms shouldn't depend on whether a school can afford managed Chromebooks, software licenses, or cloud credits. 3Compute is a project by Birdflop, a 501(c)(3) nonprofit, and is funded by donations.
          </p>
          <div className="mt-8 inline-flex flex-wrap gap-3 justify-center">
            <a
              href="https://www.paypal.com/US/fundraiser/charity/5036975"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-tomato border-none px-6 py-3 rounded-md font-semibold text-[15px] inline-flex items-center gap-2 cursor-pointer transition-[transform,filter] duration-150 hover:-translate-y-px hover:brightness-105 no-underline"
              style={{ color: '#fff', boxShadow: '0 6px 20px -4px rgba(232,93,63,0.5)' }}
            >
              <Heart size={16} /> Donate
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================
          3. How it works (merged with role cards) — paper-tinted band
         ============================================================ */}
      <section id="how-it-works" className="bg-paper-tinted px-7 py-[88px]">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-14">
            <span className="eyebrow text-forest block mb-3">How it works</span>
            <h2 className="heading-2">From sign-in to running code in minutes</h2>
            <p className="body text-ink-muted max-w-[640px] mx-auto">
              Create or join a classroom and start coding without any setup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {/* Students */}
            <div className="bg-paper-elevated border-[1.5px] border-navy rounded-2xl p-7 relative">
              <div className="flex justify-center mb-[18px]">
                <SpotEditor size={170} />
              </div>
              <Pill color="navy">Students</Pill>
              <h3 className="heading-3 mt-3 mb-5">Build and publish</h3>
              <div className="space-y-4">
                <HowStep
                  number={1}
                  icon={<UserPlus size={18} />}
                  text="Join with the code your teacher gave you."
                  color="navy"
                />
                <HowStep
                  number={2}
                  icon={<Laptop size={18} />}
                  text="Open your personal browser coding environment."
                  color="navy"
                />
                <HowStep
                  number={3}
                  icon={<Send size={18} />}
                  text="Write, run, and maintain your projects."
                  color="navy"
                />
              </div>
            </div>

            {/* Teachers */}
            <div className="bg-paper-elevated border-[1.5px] border-tomato rounded-2xl p-7 relative">
              <div className="flex justify-center mb-[18px]">
                <SpotGradebook size={170} />
              </div>
              <Pill color="tomato">Teachers</Pill>
              <h3 className="heading-3 mt-3 mb-5">Run your classroom</h3>
              <div className="space-y-4">
                <HowStep
                  number={1}
                  icon={<Code size={18} />}
                  text="Create a classroom and import or write a lesson."
                  color="tomato"
                />
                <HowStep
                  number={2}
                  icon={<Share2 size={18} />}
                  text="Share the access code with students."
                  color="tomato"
                />
                <HowStep
                  number={3}
                  icon={<Users size={18} />}
                  text="Watch progress update as students work."
                  color="tomato"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          5. Feature grid (kit, expanded with original "What you get")
         ============================================================ */}
      <section className="px-7 py-20">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="heading-2 text-center mb-10">What you get</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex gap-4">
                <div
                  className={`w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 ${ACCENT_BG_SOFT[f.color]}`}
                >
                  {f.icon}
                </div>
                <div>
                  <h4 className="heading-4 mb-1.5 mt-1">{f.title}</h4>
                  <p className="body text-ink-muted m-0">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          6. Classroom demo (RESTORED) — paper-tinted band
         ============================================================ */}
      <section className="bg-paper-tinted px-7 py-[88px]">
        <div className="max-w-[1100px] mx-auto">
          <ClassroomDemo />
        </div>
      </section>

      {/* ============================================================
          7. Students own their projects (RESTORED) — deploy diagram
         ============================================================ */}
      <section className="px-7 py-[88px]">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <span className="eyebrow text-forest block mb-3">Student ownership</span>
            <h2 className="heading-2">Class ends, but the code keeps running</h2>
            <p className="body text-ink-muted max-w-[600px] mx-auto">
              Every student project stays online, on a real public web address,
              long after the lesson is over.
            </p>
          </div>

          {/* Deploy flow — paper-cutout shapes + dashed connectors */}
          <div className="flex flex-col items-center">
            {/* Source node */}
            <div className="flex items-center gap-3 bg-paper-elevated border border-rule rounded-xl px-6 py-4 shadow-md">
              <div className="w-10 h-10 rounded-md bg-navy-soft text-navy flex items-center justify-center">
                <Terminal size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-ink-strong">Your Python code</div>
                <div className="text-xs text-ink-muted font-mono">app.py · api.py · script.py</div>
              </div>
            </div>

            {/* Arrow down */}
            <div className="flex flex-col items-center py-2">
              <svg width="24" height="36" viewBox="0 0 24 36" fill="none" aria-hidden>
                <line
                  x1="12" y1="0" x2="12" y2="28"
                  stroke="var(--c-forest)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" repeatCount="indefinite" />
                </line>
                <path d="M12 36 L4 26 L20 26 Z" fill="var(--c-forest)" />
              </svg>
            </div>

            {/* Deploy node */}
            <div className="flex items-center gap-3 bg-paper-elevated border-[1.5px] border-forest rounded-xl px-6 py-4 shadow-md">
              <div className="w-10 h-10 rounded-md bg-forest-soft text-forest flex items-center justify-center">
                <Server size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold text-forest">Deploy to 3Compute</div>
                <div className="text-xs text-ink-muted">one command · stays running · free</div>
              </div>
            </div>

            {/* Branching connector */}
            <div className="w-full max-w-[640px] mt-2">
              <svg viewBox="0 0 600 60" className="w-full overflow-visible" style={{ height: 60 }} aria-hidden>
                <defs>
                  <marker id="arr-forest" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                    <path d="M0,0 L0,8 L8,4 z" fill="var(--c-forest)" />
                  </marker>
                </defs>
                <line
                  x1="300" y1="0" x2="300" y2="20"
                  stroke="var(--c-forest)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" repeatCount="indefinite" />
                </line>
                <path
                  d="M300,20 Q300,40 110,55"
                  stroke="var(--c-forest)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  markerEnd="url(#arr-forest)"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" repeatCount="indefinite" />
                </path>
                <line
                  x1="300" y1="20" x2="300" y2="55"
                  stroke="var(--c-forest)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  markerEnd="url(#arr-forest)"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" repeatCount="indefinite" />
                </line>
                <path
                  d="M300,20 Q300,40 490,55"
                  stroke="var(--c-forest)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                  markerEnd="url(#arr-forest)"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" repeatCount="indefinite" />
                </path>
              </svg>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-paper-elevated border border-rule-soft rounded-xl p-5 text-center">
                  <div className="w-11 h-11 rounded-md bg-navy-soft text-navy flex items-center justify-center mx-auto mb-3">
                    <Globe size={22} />
                  </div>
                  <h3 className="heading-4 mb-1.5">Host websites</h3>
                  <p className="body-sm m-0">Serve a website at a public URL. Flask, FastAPI, or anything else.</p>
                </div>
                <div className="bg-paper-elevated border border-rule-soft rounded-xl p-5 text-center">
                  <div className="w-11 h-11 rounded-md bg-ochre-soft text-ochre flex items-center justify-center mx-auto mb-3">
                    <Zap size={22} />
                  </div>
                  <h3 className="heading-4 mb-1.5">Build REST APIs</h3>
                  <p className="body-sm m-0">Expose endpoints other apps can call, hosted on free infrastructure.</p>
                </div>
                <div className="bg-paper-elevated border border-rule-soft rounded-xl p-5 text-center">
                  <div className="w-11 h-11 rounded-md bg-plum-soft text-plum flex items-center justify-center mx-auto mb-3">
                    <Code size={22} />
                  </div>
                  <h3 className="heading-4 mb-1.5">Any Python app</h3>
                  <p className="body-sm m-0">Scripts, scrapers, games, automation. If it runs on Linux, it runs here.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          8. Closing CTA
         ============================================================ */}
      <section className="px-7 py-[88px]">
        <div
          className="max-w-[720px] mx-auto text-center bg-paper-elevated border border-rule-soft rounded-2xl p-14 shadow-md"
        >
          <h2 className="heading-2">Free for everyone</h2>
          <p className="body-lg text-ink-muted mb-7">
            3Compute is free for schools, clubs, and individual learners. No
            credit card, no trial period.
          </p>
          <div className="inline-flex flex-wrap gap-3 justify-center">
            <PrimaryButton
              size="lg"
              color="navy"
              onClick={handleSignIn}
              icon={<ArrowRight size={18} />}
            >
              {isLoggedIn ? 'Go to dashboard' : 'Get started'}
            </PrimaryButton>
            <a
              href="https://www.paypal.com/US/fundraiser/charity/5036975"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <GhostButton icon={<Heart size={16} />}>Donate</GhostButton>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
