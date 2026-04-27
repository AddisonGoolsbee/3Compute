import { useEffect, useState, useContext } from 'react';
import { Link, Navigate } from 'react-router';
import {
  Copy,
  Check,
  ChevronRight,
  Plus,
  LogIn,
  School,
} from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import CreateClassroomDialog from '../components/CreateClassroomDialog';
import JoinClassroomDialog from '../components/JoinClassroomDialog';
import Footer from '../components/Footer';
import { PrimaryButton, Pill } from '../components/ui/Buttons';
import { cn } from '../util/cn';

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
      1500,
    );
  };

  if (!userData?.userInfo) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="max-w-[1100px] mx-auto px-7 py-10">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
            <div className="flex-1 min-w-0">
              <h1 className="heading-1">My classrooms</h1>
              <p className="body-sm mt-2">
                {isTeacher
                  ? 'Manage your classrooms and view student progress.'
                  : 'Your classrooms and assignments.'}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {isTeacher && (
                <PrimaryButton
                  color="navy"
                  icon={<Plus size={16} />}
                  onClick={() => setCreateOpen(true)}
                >
                  Create classroom
                </PrimaryButton>
              )}
              <PrimaryButton
                color="forest"
                icon={<LogIn size={16} />}
                onClick={() => setJoinOpen(true)}
              >
                Join classroom
              </PrimaryButton>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 body text-ink-muted">Loading…</div>
          ) : (
            <div className="flex flex-col gap-10">
              {isTeacher && (
                <Section
                  title="Classrooms you own"
                  count={owned.length}
                  countLabel={(n) => (n === 1 ? '1 classroom' : `${n} classrooms`)}
                >
                  {owned.length === 0 ? (
                    <EmptyState message="No classrooms yet. Create one to get started." />
                  ) : (
                    <div className="flex flex-col gap-4">
                      {owned.map((c) => (
                        <ClassroomCard
                          key={c.id}
                          classroom={c}
                          role="owner"
                          assignments={assignmentsByClassroom[c.id] ?? []}
                          copiedId={copiedId}
                          onCopy={copyCode}
                        />
                      ))}
                    </div>
                  )}
                </Section>
              )}

              <Section
                title="Classrooms you've joined"
                count={joined.length}
                countLabel={(n) => (n === 1 ? '1 classroom' : `${n} classrooms`)}
              >
                {joined.length === 0 ? (
                  <EmptyState message="You haven't joined a classroom yet. Use a join code to get started." />
                ) : (
                  <div className="flex flex-col gap-4">
                    {joined.map((c) => (
                      <ClassroomCard
                        key={c.id}
                        classroom={c}
                        role="joined"
                        assignments={assignmentsByClassroom[c.id] ?? []}
                        copiedId={copiedId}
                        onCopy={copyCode}
                      />
                    ))}
                  </div>
                )}
              </Section>
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

function Section({
  title,
  count,
  countLabel,
  children,
}: {
  title: string;
  count: number;
  countLabel: (n: number) => string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="heading-2">{title}</h2>
        <span className="body-sm">{countLabel(count)}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-paper-elevated border border-rule-soft rounded-xl p-10 flex flex-col items-center text-center shadow-sm">
      <School size={32} className="text-ink-faint mb-2" />
      <p className="body-sm">{message}</p>
    </div>
  );
}

function ClassroomCard({
  classroom,
  role,
  assignments,
  copiedId,
  onCopy,
}: {
  classroom: Classroom;
  role: 'owner' | 'joined';
  assignments: AssignmentTemplate[];
  copiedId: string | null;
  onCopy: (e: React.MouseEvent, c: Classroom) => void;
}) {
  const isOwner = role === 'owner';
  const accentBorder = isOwner ? 'border-l-forest' : 'border-l-navy';
  const eyebrowColor = isOwner ? 'text-forest' : 'text-navy';
  const eyebrowText = isOwner ? 'Owner' : 'Student';
  const studentCount = classroom.participants?.length ?? 0;
  const visibleAssignments = assignments.slice(0, 3);
  const overflowCount = Math.max(0, assignments.length - visibleAssignments.length);

  return (
    <Link
      to={`/classrooms/${classroom.id}`}
      className={cn(
        'block bg-paper-elevated border border-rule-soft rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow',
        'flex items-start gap-4 border-l-[3px] no-underline text-ink-default',
        accentBorder,
      )}
    >
      <div className="flex-1 min-w-0">
        <span className={cn('eyebrow', eyebrowColor)}>{eyebrowText}</span>
        <div className="flex items-center gap-3 mt-1.5">
          <h3 className="heading-3 truncate">{classroom.name}</h3>
          {classroom.joins_paused && <Pill color="ochre">Joins paused</Pill>}
        </div>
        <p className="body-sm mt-1.5">
          {studentCount} {studentCount === 1 ? 'student' : 'students'}
          {assignments.length > 0 && (
            <>
              {' · '}
              {assignments.length}{' '}
              {assignments.length === 1 ? 'assignment' : 'assignments'}
            </>
          )}
        </p>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <code className="bg-ochre-soft text-ochre border border-ochre/30 px-3 py-1.5 rounded-md font-mono text-sm tracking-[0.12em] font-semibold inline-flex items-center gap-2">
            {formatCode(classroom.access_code)}
          </code>
          <button
            type="button"
            onClick={(e) => onCopy(e, classroom)}
            className="text-ochre hover:bg-ochre/10 rounded-sm p-1 transition-colors cursor-pointer"
            title="Copy join code"
            aria-label="Copy join code"
          >
            {copiedId === classroom.id ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        {visibleAssignments.length > 0 && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {visibleAssignments.map((t) => (
              <Pill key={t.name} color="forest">{t.name}</Pill>
            ))}
            {overflowCount > 0 && (
              <Pill color="forest">+{overflowCount} more</Pill>
            )}
          </div>
        )}
      </div>

      <ChevronRight
        size={18}
        className="text-navy shrink-0 mt-1"
        aria-hidden="true"
      />
    </Link>
  );
}
