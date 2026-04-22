import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  ChevronRight,
  Plus,
  LogIn,
  ExternalLink,
  GraduationCap,
  FolderOpen,
} from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import CreateClassroomDialog from '../components/CreateClassroomDialog';
import JoinClassroomDialog from '../components/JoinClassroomDialog';
import Footer from '../components/Footer';

interface Classroom {
  id: string;
  name: string;
  access_code: string;
  participants?: string[];
  instructors?: string[];
  joins_paused?: boolean;
}

interface AssignmentTemplate {
  name: string;
  files: string[];
}

function formatCode(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

export default function ClassroomsPage() {
  const userData = useContext(UserDataContext);
  const [owned, setOwned] = useState<Classroom[]>([]);
  const [joined, setJoined] = useState<Classroom[]>([]);
  const [assignmentsByClassroom, setAssignmentsByClassroom] = useState<
    Record<string, AssignmentTemplate[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const isTeacher = userData?.userInfo?.role === 'teacher';

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => {
      document.documentElement.style.overflowY = 'hidden';
    };
  }, []);

  const fetchClassrooms = () => {
    fetch(`${apiUrl}/classrooms/`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setOwned(data.owner ?? []);
        setJoined(data.joined ?? []);
      })
      .catch(() => {
        setOwned([]);
        setJoined([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!userData?.userInfo) return;
    fetchClassrooms();
    fetch(`${apiUrl}/classrooms/assignments`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, AssignmentTemplate[]> = {};
        for (const c of data.classrooms ?? []) map[c.id] = c.templates ?? [];
        setAssignmentsByClassroom(map);
      })
      .catch(() => setAssignmentsByClassroom({}));
  }, [userData?.userInfo]);

  const copyCode = async (e: React.MouseEvent, classroom: Classroom) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(classroom.access_code);
    } catch {
      /* ignore clipboard failures */
    }
    setCopiedId(classroom.id);
    setTimeout(
      () => setCopiedId((p) => (p === classroom.id ? null : p)),
      2000,
    );
  };

  const hasAny = owned.length + joined.length > 0;

  return (
    <div className="-mt-20 min-h-screen flex flex-col bg-gray-950 text-white">
      <header className="pt-24 pb-8 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/ide"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            Back to IDE
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">Classrooms</h1>
              <p className="text-gray-400 text-sm">
                {isTeacher
                  ? 'Manage your classrooms and view student progress.'
                  : 'Your classrooms and assignments.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setJoinOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-sm font-medium transition-colors text-gray-200"
              >
                <LogIn size={15} />
                Join
              </button>
              {isTeacher && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#54daf4] hover:bg-[#7ee4f7] text-gray-950 text-sm font-semibold transition-colors"
                >
                  <Plus size={15} />
                  Create
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-20 text-gray-500">Loading…</div>
          ) : !hasAny ? (
            <EmptyState isTeacher={isTeacher} />
          ) : (
            <div className="flex flex-col gap-4">
              {owned.map((c) => (
                <TeacherClassroomCard
                  key={c.id}
                  classroom={c}
                  copiedId={copiedId}
                  onCopy={copyCode}
                />
              ))}
              {joined.map((c) => (
                <StudentClassroomCard
                  key={c.id}
                  classroom={c}
                  assignments={assignmentsByClassroom[c.id] ?? []}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <CreateClassroomDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          fetchClassrooms();
        }}
      />
      <JoinClassroomDialog
        open={joinOpen}
        onClose={() => {
          setJoinOpen(false);
          fetchClassrooms();
        }}
      />
    </div>
  );
}

function EmptyState({ isTeacher }: { isTeacher: boolean }) {
  return (
    <div className="text-center py-20 rounded-xl border border-gray-800 bg-gray-900">
      <Users size={40} className="mx-auto mb-4 text-gray-600" />
      <p className="text-gray-200 mb-1 font-medium">No classrooms yet</p>
      <p className="text-gray-500 text-sm">
        {isTeacher
          ? 'Create a classroom, or join one with an access code.'
          : 'Join a classroom with an access code from your teacher.'}
      </p>
    </div>
  );
}

function TeacherClassroomCard({
  classroom,
  copiedId,
  onCopy,
}: {
  classroom: Classroom;
  copiedId: string | null;
  onCopy: (e: React.MouseEvent, c: Classroom) => void;
}) {
  return (
    <Link
      to={`/classrooms/${classroom.id}`}
      className="block rounded-xl border border-gray-800 bg-gray-900 hover:bg-gray-800 hover:border-gray-700 transition-colors group hover:no-underline!"
    >
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
          <GraduationCap size={18} className="text-gray-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold truncate">
              {classroom.name}
            </h2>
            <RoleBadge role="teacher" />
            {classroom.joins_paused && <PausedBadge />}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {classroom.participants?.length ?? 0}{' '}
              {(classroom.participants?.length ?? 0) === 1
                ? 'student'
                : 'students'}
            </span>
            <span className="text-gray-700">·</span>
            <span className="flex items-center gap-1">
              <span className="text-gray-500">Code</span>
              <span className="font-mono text-gray-200 tracking-[0.12em]">
                {formatCode(classroom.access_code)}
              </span>
              <button
                onClick={(e) => onCopy(e, classroom)}
                className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700"
                title="Copy join code"
              >
                {copiedId === classroom.id ? (
                  <Check size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </span>
          </div>
        </div>
        <ChevronRight
          size={18}
          className="text-gray-700 group-hover:text-gray-400 transition-colors"
        />
      </div>
    </Link>
  );
}

function StudentClassroomCard({
  classroom,
  assignments,
}: {
  classroom: Classroom;
  assignments: AssignmentTemplate[];
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-800">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
          <Users size={18} className="text-gray-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold truncate">
              {classroom.name}
            </h2>
            <RoleBadge role="student" />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {assignments.length}{' '}
            {assignments.length === 1 ? 'assignment' : 'assignments'}
          </div>
        </div>
        <Link
          to={`/ide?classroom=${classroom.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700 transition-colors"
        >
          <ExternalLink size={12} />
          Open in IDE
        </Link>
      </div>
      {assignments.length === 0 ? (
        <div className="px-5 py-6 text-sm text-gray-500 text-center">
          No assignments yet.
        </div>
      ) : (
        <ul className="divide-y divide-gray-800">
          {assignments.map((t) => (
            <li key={t.name}>
              <Link
                to={`/ide?classroom=${classroom.id}&folder=${encodeURIComponent(t.name)}`}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-800 transition-colors group hover:no-underline!"
              >
                <FolderOpen
                  size={16}
                  className="text-gray-500 group-hover:text-[#54daf4] shrink-0 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-100 truncate">
                    {t.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t.files.length}{' '}
                    {t.files.length === 1 ? 'file' : 'files'}
                  </div>
                </div>
                <ExternalLink
                  size={13}
                  className="text-gray-600 group-hover:text-gray-300 transition-colors"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: 'teacher' | 'student' }) {
  if (role === 'teacher') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#54daf4] text-gray-950 font-bold uppercase tracking-wider">
        Teacher
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-semibold uppercase tracking-wider border border-gray-700">
      Student
    </span>
  );
}

function PausedBadge() {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900 text-amber-200 font-semibold uppercase tracking-wider border border-amber-800">
      Paused
    </span>
  );
}
