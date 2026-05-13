import { useContext, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { AlertTriangle, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';
import { useVerifiedAdmin } from '../util/useVerifiedAdmin';
import AdminSubNav from '../components/AdminSubNav';
import Footer from '../components/Footer';
import { GhostButton, Pill, PrimaryButton } from '../components/ui/Buttons';

interface AdminClassroom {
  id: string;
  name: string;
  access_code: string;
  created_by_email: string | null;
  created_at: string | null;
  joins_paused: boolean;
  grading_mode: string;
  instructor_count: number;
  participant_count: number;
  assignment_count: number;
}

interface AdminUserLite {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
}

export default function AdminClassroomsPage() {
  const userData = useContext(UserDataContext);
  const location = useLocation();
  const [rows, setRows] = useState<AdminClassroom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const isLoggedIn = !!userData?.userInfo;
  const adminVerified = useVerifiedAdmin(isLoggedIn);
  const isAdmin = adminVerified === true;
  const [reassignFor, setReassignFor] = useState<AdminClassroom | null>(null);
  const [deleteFor, setDeleteFor] = useState<AdminClassroom | null>(null);

  const reassign = async (classroomId: string, targetUserId: string) => {
    const res = await fetch(`${apiUrl}/admin/classrooms/${classroomId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ created_by: targetUserId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `${res.status} ${res.statusText}`);
    }
    await loadRef.current();
  };

  const deleteClassroom = async (classroomId: string) => {
    const res = await fetch(`${apiUrl}/admin/classrooms/${classroomId}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `${res.status} ${res.statusText}`);
    }
    await loadRef.current();
  };

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => { document.documentElement.style.overflowY = 'hidden'; };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      setRefreshing(true);
      try {
        const res = await fetch(`${apiUrl}/admin/classrooms`, { credentials: 'include' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!cancelled) { setRows(data.classrooms || []); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) { setRefreshing(false); setLoading(false); }
      }
    };
    loadRef.current = load;
    load();
    timerRef.current = setInterval(load, 10_000);
    return () => { cancelled = true; if (timerRef.current) clearInterval(timerRef.current); };
  }, [isAdmin]);

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  if (adminVerified === null) return null;
  if (!isAdmin) {
    return <AdminRestricted />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-7 py-10">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
            <div>
              <h1 className="heading-1">Classrooms</h1>
              <p className="body-sm mt-1.5">
                {rows.length} classroom{rows.length === 1 ? '' : 's'}. Auto-refreshes every 10s.
              </p>
            </div>
            <GhostButton
              icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => loadRef.current()}
            >
              Refresh
            </GhostButton>
          </div>

          <AdminSubNav active={location.pathname} />

          {loading && rows.length === 0 && (
            <div className="body text-ink-muted text-center py-10">Loading…</div>
          )}
          {error && (
            <div className="mb-4 bg-tomato-soft border border-tomato/30 rounded-md px-4 py-3 text-tomato text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full bg-paper-elevated border border-rule-soft rounded-xl overflow-hidden border-collapse">
              <thead>
                <tr className="bg-paper-tinted">
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Name</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Code</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Owner</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Instructors</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Students</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Assignments</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Grading</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Joins</th>
                  <th className="pl-3! pr-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-strong"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t border-rule-soft hover:bg-paper-tinted/50 transition-colors">
                    <td className="pl-3! pr-3 py-2.5 text-sm text-ink-strong font-medium">{c.name}</td>
                    <td className="pl-3! pr-3 py-2.5 text-sm font-mono text-ink-muted">{c.access_code}</td>
                    <td className="pl-3! pr-3 py-2.5 text-sm font-mono text-ink-default">
                      {c.created_by_email || <span className="text-ink-faint">—</span>}
                    </td>
                    <td className="pl-3! pr-3 py-2.5 text-sm text-ink-default">{c.instructor_count}</td>
                    <td className="pl-3! pr-3 py-2.5 text-sm text-ink-default">{c.participant_count}</td>
                    <td className="pl-3! pr-3 py-2.5 text-sm text-ink-default">{c.assignment_count}</td>
                    <td className="pl-3! pr-3 py-2.5 text-sm text-ink-muted">{c.grading_mode}</td>
                    <td className="pl-3! pr-3 py-2.5 text-sm">
                      {c.joins_paused
                        ? <Pill color="ochre">paused</Pill>
                        : <Pill color="forest">open</Pill>}
                    </td>
                    <td className="pl-3! pr-3 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setReassignFor(c)}
                          className="p-1.5 rounded-md text-ink-muted hover:bg-paper-tinted hover:text-ink-strong transition-colors"
                          title="Reassign owner"
                          aria-label="Reassign owner"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteFor(c)}
                          className="p-1.5 rounded-md text-ink-muted hover:bg-tomato-soft hover:text-tomato transition-colors"
                          title="Delete classroom"
                          aria-label="Delete classroom"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="pl-3! pr-3 py-6 text-center text-sm text-ink-muted">
                      No classrooms.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

      {reassignFor && (
        <ReassignClassroomDialog
          classroom={reassignFor}
          onClose={() => setReassignFor(null)}
          onSave={async (userId) => {
            await reassign(reassignFor.id, userId);
            setReassignFor(null);
          }}
        />
      )}
      {deleteFor && (
        <DeleteClassroomDialog
          classroom={deleteFor}
          onClose={() => setDeleteFor(null)}
          onConfirm={async () => {
            await deleteClassroom(deleteFor.id);
            setDeleteFor(null);
          }}
        />
      )}
    </div>
  );
}

function ReassignClassroomDialog({
  classroom, onClose, onSave,
}: {
  classroom: AdminClassroom;
  onClose: () => void;
  onSave: (userId: string) => Promise<void>;
}) {
  const [users, setUsers] = useState<AdminUserLite[] | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/admin/users`, { credentials: 'include' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (cancelled) return;
        const eligible: AdminUserLite[] = (data.users || [])
          .filter((u: AdminUserLite) =>
            u.role === 'teacher' || u.email.toLowerCase().endsWith('@birdflop.com'),
          )
          .sort((a: AdminUserLite, b: AdminUserLite) => a.email.localeCompare(b.email));
        setUsers(eligible);
        const currentOwner = eligible.find((u) => u.email === classroom.created_by_email);
        setSelected(currentOwner?.id || eligible[0]?.id || '');
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load users');
      }
    })();
    return () => { cancelled = true; };
  }, [classroom.created_by_email]);

  const submit = async () => {
    if (!selected) return;
    setWorking(true);
    setError(null);
    try {
      await onSave(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setWorking(false);
    }
  };

  return (
    <DialogShell onClose={onClose} title="Reassign classroom">
      <p className="body-sm text-ink-muted mb-4">
        For <span className="font-semibold text-ink-strong">{classroom.name}</span>{' '}
        (<span className="font-mono text-ink-default">{classroom.access_code}</span>).
        Sets the owner and ensures they are an instructor. Existing instructors
        are preserved.
      </p>
      <label className="block text-sm font-semibold text-ink-strong mb-1.5">New owner</label>
      {users === null && !loadError && (
        <div className="body-sm text-ink-muted">Loading users…</div>
      )}
      {loadError && (
        <div className="text-sm text-tomato">{loadError}</div>
      )}
      {users && users.length === 0 && (
        <div className="body-sm text-ink-muted">No eligible teachers or admins found.</div>
      )}
      {users && users.length > 0 && (
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-3 py-2.5 bg-paper border border-rule rounded-md text-ink-strong text-[15px] focus:outline-none focus:border-navy"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}{u.role ? ` — ${u.role}` : ''}
            </option>
          ))}
        </select>
      )}
      {error && <div className="mt-3 text-sm text-tomato">{error}</div>}
      <div className="flex gap-2 justify-end mt-6">
        <GhostButton onClick={onClose} disabled={working}>Cancel</GhostButton>
        <PrimaryButton color="navy" size="md" onClick={submit} disabled={working || !selected}>
          {working ? 'Saving…' : 'Reassign'}
        </PrimaryButton>
      </div>
    </DialogShell>
  );
}

function DeleteClassroomDialog({
  classroom, onClose, onConfirm,
}: {
  classroom: AdminClassroom;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expected = classroom.access_code;
  const canConfirm = confirmText.trim() === expected && !working;

  const submit = async () => {
    if (!canConfirm) return;
    setWorking(true);
    setError(null);
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setWorking(false);
    }
  };

  const totalMembers = classroom.instructor_count + classroom.participant_count;

  return (
    <DialogShell onClose={onClose} title="Delete classroom">
      <p className="body-sm text-ink-default mb-3">
        Deleting <span className="font-semibold text-ink-strong">{classroom.name}</span>{' '}
        removes all memberships, assignment weights, templates, test results, and
        manual scores, and removes the classroom directory at{' '}
        <code className="font-mono text-xs">/var/lib/csroom/classrooms/{classroom.id}</code>.
      </p>
      {(totalMembers > 0 || classroom.assignment_count > 0) && (
        <div className="mb-3 bg-ochre-soft border border-ochre/30 rounded-md px-3 py-2 text-sm text-ink-default">
          {totalMembers > 0 && (
            <div>
              {classroom.instructor_count} instructor{classroom.instructor_count === 1 ? '' : 's'} and{' '}
              {classroom.participant_count} student{classroom.participant_count === 1 ? '' : 's'} will lose access.
            </div>
          )}
          {classroom.assignment_count > 0 && (
            <div>
              {classroom.assignment_count} assignment{classroom.assignment_count === 1 ? '' : 's'} will be deleted.
            </div>
          )}
        </div>
      )}
      <p className="body-sm text-ink-muted mb-4">
        Type <code className="font-mono text-ink-strong">{expected}</code> (the access code) to confirm.
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        autoFocus
        className="w-full px-3 py-2.5 bg-paper border border-rule rounded-md text-ink-strong text-[15px] focus:outline-none focus:border-tomato font-mono"
      />
      {error && <div className="mt-3 text-sm text-tomato">{error}</div>}
      <div className="flex gap-2 justify-end mt-6">
        <GhostButton onClick={onClose} disabled={working}>Cancel</GhostButton>
        <button
          onClick={submit}
          disabled={!canConfirm}
          className="bg-tomato text-white font-semibold px-5 py-[11px] text-[14.5px] rounded-md inline-flex items-center gap-2 cursor-pointer transition-[filter] duration-150 hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {working ? 'Deleting…' : 'Delete classroom'}
        </button>
      </div>
    </DialogShell>
  );
}

function DialogShell({
  title, onClose, children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/30 p-4"
      onClick={onClose}
    >
      <div
        className="bg-paper-elevated border border-rule rounded-xl shadow-lg w-full max-w-[480px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-strong">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:bg-paper-tinted hover:text-ink-strong"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
