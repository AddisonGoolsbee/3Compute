import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowRight, GraduationCap, School } from 'lucide-react';
import Layout from '../Layout';
import { DemoExplorerPanel, type DemoFileTreeNode } from '../components/DemoExplorerPanel';
import { DemoEditorPanel, type DemoOpenTab } from '../components/DemoEditorPanel';
import { DemoTerminalPanel } from '../components/DemoTerminalPanel';
import { apiUrl } from '../util/UserData';
import { cn } from '../util/cn';

type Role = 'teacher' | 'student';

const DEMO_CLASSROOM_SLUG = 'cs-101-demo-classroom';
const DEMO_STUDENTS: { email: string; name: string }[] = [
  { email: 'aiden.park@csroom.demo', name: 'Aiden Park' },
  { email: 'bea.okafor@csroom.demo', name: 'Bea Okafor' },
  { email: 'casey.tran@csroom.demo', name: 'Casey Tran' },
  { email: 'diego.alvarez@csroom.demo', name: 'Diego Alvarez' },
  { email: 'eleanor.cho@csroom.demo', name: 'Eleanor Cho' },
];
// The "you" student in the student-perspective demo. Picked deliberately:
// Aiden has all assignments completed so the demo opens to a working file.
const DEMO_PRIMARY_STUDENT_EMAIL = 'aiden.park@csroom.demo';

interface AssignmentEntry {
  name: string;
  files: string[];
}

/** Per-file fetch metadata baked into each leaf. The terminal/editor read
 *  this to know whether to call /api/demo/assignment-file or
 *  /api/demo/student-file with which email. */
interface DemoFileMeta {
  /** Path in the simulated filesystem (display + terminal). */
  path: string;
  /** API source. */
  fetcher: { kind: 'assignment'; template: string; relPath: string }
         | { kind: 'student'; email: string; relPath: string }
         | { kind: 'draft'; draft: string; relPath: string };
}

export default function DemoClassroomPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const role: Role = searchParams.get('role') === 'teacher' ? 'teacher' : 'student';

  const switchRole = (next: Role) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('role', next);
    setSearchParams(sp, { replace: true });
  };

  return (
    // Take exactly the viewport height below the global Nav (5.5rem). The
    // banner is one of our flex children; Layout takes the rest with
    // min-h-0 so its inner overflow doesn't blow out the page.
    <div className="flex flex-col" style={{ height: 'calc(100svh - 5.5rem)' }}>
      <DemoBanner role={role} onChangeRole={switchRole} />
      <div className="flex-1 min-h-0">
        <DemoIDE role={role} />
      </div>
    </div>
  );
}

function DemoBanner({
  role, onChangeRole,
}: { role: Role; onChangeRole: (r: Role) => void }) {
  return (
    <div className="bg-navy-soft border-b border-navy/20 px-4 sm:px-7 py-2.5">
      <div className="max-w-[1480px] mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="eyebrow text-navy">Demo workspace</span>
          <span className="body-sm text-ink-default">
            Edits live in your browser. Sign up to save and run real code.
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/demo/classroom"
            className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1.5 text-sm no-underline px-3 py-1 rounded-md hover:bg-navy/10 transition-colors"
          >
            <School size={14} />
            Open classroom dashboard
          </Link>
          <div role="tablist" aria-label="Demo perspective" className="inline-flex items-center bg-paper border border-rule rounded-full p-1">
            {(['teacher', 'student'] as const).map((r) => {
              const active = r === role;
              return (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onChangeRole(r)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5',
                    active ? 'bg-navy text-white' : 'text-ink-muted hover:text-ink-strong',
                  )}
                >
                  {r === 'teacher' ? <GraduationCap size={12} /> : <School size={12} />}
                  View as {r}
                </button>
              );
            })}
          </div>
          <Link
            to="/request-access"
            className="text-navy hover:text-navy/80 font-semibold inline-flex items-center gap-1 text-sm no-underline"
          >
            Sign up
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IDE shell — uses the real Layout, plugs in the demo panels.
// ---------------------------------------------------------------------------

function DemoIDE({ role }: { role: Role }) {
  const [assignments, setAssignments] = useState<AssignmentEntry[] | null>(null);
  // Drafts share the AssignmentEntry shape (name + flat file list).
  const [drafts, setDrafts] = useState<AssignmentEntry[] | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [openTabs, setOpenTabs] = useState<DemoOpenTab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);

  // Per-path fetch metadata so the editor knows whose file to load.
  const [meta, setMeta] = useState<Record<string, DemoFileMeta>>({});

  // 1) Pull the assignment template tree (shared by both perspectives).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [assignmentsRes, draftsRes] = await Promise.all([
          fetch(`${apiUrl}/demo/assignments`),
          fetch(`${apiUrl}/demo/drafts`),
        ]);
        if (cancelled) return;
        if (assignmentsRes.ok) {
          const data = await assignmentsRes.json();
          setAssignments((data.templates ?? []) as AssignmentEntry[]);
        }
        if (draftsRes.ok) {
          const data = await draftsRes.json();
          setDrafts((data.drafts ?? []) as AssignmentEntry[]);
        } else {
          setDrafts([]);
        }
      } catch {
        setAssignments([]);
        setDrafts([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2) Build the file tree + per-path metadata for the chosen role.
  const tree: DemoFileTreeNode[] = useMemo(() => {
    if (!assignments || !drafts) return [];
    const newMeta: Record<string, DemoFileMeta> = {};

    const buildAssignmentBranch = (
      template: string, files: string[], pathPrefix: string,
      fetcherFor: (relPath: string) => DemoFileMeta['fetcher'],
    ): DemoFileTreeNode => ({
      name: template,
      children: files.map((f) => {
        const path = `${pathPrefix}/${template}/${f}`;
        newMeta[path] = { path, fetcher: fetcherFor(`${template}/${f}`) };
        return { name: f, path };
      }),
    });

    let roots: DemoFileTreeNode[];
    if (role === 'student') {
      // Student tree: classroom-slug/{assignment}/...
      roots = [{
        name: DEMO_CLASSROOM_SLUG,
        children: assignments.map((a) =>
          buildAssignmentBranch(
            a.name, a.files, `/${DEMO_CLASSROOM_SLUG}`,
            (rel) => ({ kind: 'student', email: DEMO_PRIMARY_STUDENT_EMAIL, relPath: rel }),
          ),
        ),
      }];
    } else {
      // Teacher tree: classroom-slug/{assignments,drafts,participants/{email}}/...
      const assignmentsBranch: DemoFileTreeNode = {
        name: 'assignments',
        children: assignments.map((a) =>
          buildAssignmentBranch(
            a.name, a.files, `/${DEMO_CLASSROOM_SLUG}/assignments`,
            (rel) => ({ kind: 'assignment', template: a.name, relPath: rel.split('/').slice(1).join('/') }),
          ),
        ),
      };
      const draftsBranch: DemoFileTreeNode = {
        name: 'drafts',
        children: drafts.map((d) =>
          buildAssignmentBranch(
            d.name, d.files, `/${DEMO_CLASSROOM_SLUG}/drafts`,
            (rel) => ({ kind: 'draft', draft: d.name, relPath: rel.split('/').slice(1).join('/') }),
          ),
        ),
      };
      const participantsBranch: DemoFileTreeNode = {
        name: 'participants',
        children: DEMO_STUDENTS.map((s) => ({
          name: s.email,
          children: assignments.map((a) =>
            buildAssignmentBranch(
              a.name, a.files,
              `/${DEMO_CLASSROOM_SLUG}/participants/${s.email}`,
              (rel) => ({ kind: 'student', email: s.email, relPath: rel }),
            ),
          ),
        })),
      };
      roots = [{
        name: DEMO_CLASSROOM_SLUG,
        children: [assignmentsBranch, draftsBranch, participantsBranch],
      }];
    }

    // The fetcher closures above hand back relPath as `template/file`. Fix
    // the assignment-branch wrapper that double-prefixed the template name.
    for (const path of Object.keys(newMeta)) {
      const m = newMeta[path];
      if (m.fetcher.kind === 'assignment') {
        // path looks like /<slug>/assignments/<template>/<file...>
        const segs = path.split('/').filter(Boolean);
        // segs = [slug, 'assignments', template, ...rest]
        const template = segs[2];
        const rest = segs.slice(3).join('/');
        newMeta[path] = { path, fetcher: { kind: 'assignment', template, relPath: rest } };
      } else if (m.fetcher.kind === 'student') {
        const segs = path.split('/').filter(Boolean);
        // student tree: [slug, template, ...]   -> relPath = segs[1..]
        // teacher participants: [slug, 'participants', email, template, ...] -> relPath = segs[3..]
        const isParticipantPath = segs[1] === 'participants';
        const rest = isParticipantPath ? segs.slice(3).join('/') : segs.slice(1).join('/');
        newMeta[path] = { path, fetcher: { kind: 'student', email: m.fetcher.email, relPath: rest } };
      } else if (m.fetcher.kind === 'draft') {
        // path looks like /<slug>/drafts/<draft>/<file...>
        const segs = path.split('/').filter(Boolean);
        const draft = segs[2];
        const rest = segs.slice(3).join('/');
        newMeta[path] = { path, fetcher: { kind: 'draft', draft, relPath: rest } };
      }
    }
    setMeta(newMeta);
    return roots;
  }, [assignments, drafts, role]);

  // Reset open tabs when role changes (paths are role-specific).
  useEffect(() => {
    setOpenTabs([]);
    setActivePath(null);
  }, [role]);

  // Auto-open one file as soon as the tree is ready and nothing is open.
  useEffect(() => {
    if (openTabs.length > 0 || tree.length === 0) return;
    const firstStudentPath = role === 'student'
      ? `/${DEMO_CLASSROOM_SLUG}/fizzbuzz/fizzbuzz.py`
      : `/${DEMO_CLASSROOM_SLUG}/assignments/fizzbuzz/fizzbuzz.py`;
    if (meta[firstStudentPath]) {
      openFile(firstStudentPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, meta, role]);

  // Fetch the content for a file lazily.
  const fetchContent = useCallback(async (path: string) => {
    if (files[path] !== undefined) return;
    const m = meta[path];
    if (!m) return;
    let url: string;
    if (m.fetcher.kind === 'assignment') {
      url = `${apiUrl}/demo/assignment-file?template=${encodeURIComponent(m.fetcher.template)}&path=${encodeURIComponent(m.fetcher.relPath)}`;
    } else if (m.fetcher.kind === 'draft') {
      url = `${apiUrl}/demo/draft-file?draft=${encodeURIComponent(m.fetcher.draft)}&path=${encodeURIComponent(m.fetcher.relPath)}`;
    } else {
      url = `${apiUrl}/demo/student-file?email=${encodeURIComponent(m.fetcher.email)}&path=${encodeURIComponent(m.fetcher.relPath)}`;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setFiles((prev) => ({ ...prev, [path]: data.content as string }));
    } catch { /* ignore */ }
  }, [files, meta]);

  // When the active file changes, ensure its content is loaded.
  useEffect(() => {
    if (activePath) fetchContent(activePath);
  }, [activePath, fetchContent]);

  // Once the tree is loaded, prefetch every file so the simulated terminal
  // ("cat", "ls" etc.) can answer without round trips. Walk sequentially —
  // the teacher view has ~60 files, and firing them all in parallel
  // saturates the backend's DB pool and stalls the rest of the API.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const path of Object.keys(meta)) {
        if (cancelled) return;
        await fetchContent(path);
      }
    })();
    return () => { cancelled = true; };
  }, [meta, fetchContent]);

  const openFile = (path: string) => {
    if (!meta[path]) return;
    const name = path.split('/').pop() ?? path;
    setOpenTabs((prev) => prev.some((t) => t.path === path) ? prev : [...prev, { path, name }]);
    setActivePath(path);
  };

  const closeFile = (path: string) => {
    setOpenTabs((prev) => prev.filter((t) => t.path !== path));
    setActivePath((cur) => (cur === path
      ? (openTabs.find((t) => t.path !== path)?.path ?? null)
      : cur));
  };

  const onChange = (path: string, value: string) => {
    setFiles((prev) => ({ ...prev, [path]: value }));
  };

  // The terminal sees the same paths, so its "ls" / "cat" reflect what the
  // user has been editing.
  const terminalFiles = useMemo(() => {
    // Drop the leading slash because the simulated shell treats paths as
    // relative to the demo root.
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(files)) {
      out[k.replace(/^\//, '')] = v;
    }
    return out;
  }, [files]);

  const greeting = role === 'student'
    ? 'Welcome to your CS 101 workspace.'
    : 'Welcome to the CS 101 instructor workspace.';
  const promptUser = role === 'student' ? 'student@demo' : 'instructor@demo';

  return (
    <Layout
      fillParent
      explorer={
        <DemoExplorerPanel
          tree={tree}
          activePath={activePath}
          onOpenFile={openFile}
          getFileContent={(p) => files[p]}
          initialOpenFolders={
            role === 'student'
              ? [`/${DEMO_CLASSROOM_SLUG}`, `/${DEMO_CLASSROOM_SLUG}/fizzbuzz`]
              : [`/${DEMO_CLASSROOM_SLUG}`, `/${DEMO_CLASSROOM_SLUG}/assignments`]
          }
        />
      }
      editor={
        <DemoEditorPanel
          openTabs={openTabs}
          activePath={activePath}
          files={files}
          onActivate={setActivePath}
          onClose={closeFile}
          onChange={onChange}
          onRun={(_path, command) => {
            window.dispatchEvent(new CustomEvent('csroom:demo-run', { detail: { command } }));
          }}
        />
      }
    >
      <DemoTerminalPanel
        files={terminalFiles}
        greeting={greeting}
        initialCwd={DEMO_CLASSROOM_SLUG}
        promptUser={promptUser}
      />
    </Layout>
  );
}
