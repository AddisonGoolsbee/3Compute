import { useContext, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { AlertTriangle, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';
import { useVerifiedAdmin } from '../util/useVerifiedAdmin';
import AdminSubNav from '../components/AdminSubNav';
import Footer from '../components/Footer';
import { GhostButton, Pill, PrimaryButton } from '../components/ui/Buttons';
import { cn } from '../util/cn';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  port_start: number;
  port_end: number;
  port_conflict: boolean;
  first_login: string | null;
  last_login: string | null;
  container_running: boolean;
  classroom_count: number;
}

const AVATAR_BG: string[] = ['bg-tomato', 'bg-navy', 'bg-forest', 'bg-ochre', 'bg-plum'];

function fmtRelative(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diffMs = Date.now() - t;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function initials(email: string, name: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] || '').concat(parts[1]?.[0] || '').toUpperCase().slice(0, 2);
  }
  const handle = email.split('@')[0] || email;
  return handle.slice(0, 2).toUpperCase();
}

type RoleColor = 'navy' | 'forest' | 'plum' | 'ochre';

function roleColor(role: string | null): RoleColor {
  if (!role) return 'ochre';
  const r = role.toLowerCase();
  if (r === 'teacher' || r === 'instructor') return 'navy';
  if (r === 'student' || r === 'participant') return 'forest';
  if (r === 'admin') return 'plum';
  return 'ochre';
}

export default function AdminUsersPage() {
  const userData = useContext(UserDataContext);
  const location = useLocation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const isLoggedIn = !!userData?.userInfo;
  const adminVerified = useVerifiedAdmin(isLoggedIn);
  const isAdmin = adminVerified === true;
  const myEmail = (userData?.userInfo?.email || '').toLowerCase();
  const [roleEditFor, setRoleEditFor] = useState<AdminUser | null>(null);
  const [deleteFor, setDeleteFor] = useState<AdminUser | null>(null);

  const updateRole = async (userId: string, role: string | null) => {
    const res = await fetch(`${apiUrl}/admin/users/${userId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `${res.status} ${res.statusText}`);
    }
    await loadRef.current();
  };

  const deleteUser = async (userId: string) => {
    const res = await fetch(`${apiUrl}/admin/users/${userId}`, {
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
        const res = await fetch(`${apiUrl}/admin/users`, { credentials: 'include' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!cancelled) {
          setUsers(data.users || []);
          setError(null);
        }
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

  const conflictUsers = users.filter((u) => u.port_conflict);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-7 py-10">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
            <div>
              <h1 className="heading-1">Users</h1>
              <p className="body-sm mt-1.5">
                {users.length} account{users.length === 1 ? '' : 's'}. Auto-refreshes every 10s.
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

          {loading && users.length === 0 && (
            <div className="body text-ink-muted text-center py-10">Loading…</div>
          )}
          {error && (
            <div className="mb-4 bg-tomato-soft border border-tomato/30 rounded-md px-4 py-3 text-tomato text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {conflictUsers.length > 0 && (
            <div className="mb-4 bg-ochre-soft border border-ochre/30 rounded-md px-4 py-3 text-ochre text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Port range overlap detected</div>
                <div className="text-ochre/90 text-xs mt-1">
                  {conflictUsers.map((u) => u.email).join(', ')}.
                  Fix via{' '}
                  <code className="bg-paper-deeper text-ink-default font-mono px-1.5 py-0.5 rounded-sm">
                    fix-stuck-user.md
                  </code>{' '}
                  — a signup race can produce this and the second container will fail to spawn.
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full bg-paper-elevated border border-rule-soft rounded-xl overflow-hidden border-collapse">
              <thead>
                <tr className="bg-paper-tinted">
                  <th className="pl-4! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">User</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Role</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Ports</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Container</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Classes</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Last login</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">First login</th>
                  <th className="pl-3! pr-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-strong"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const avatarColor = AVATAR_BG[i % AVATAR_BG.length];
                  return (
                    <tr key={u.id} className="border-t border-rule-soft hover:bg-paper-tinted/50 transition-colors">
                      <td className="pl-4! pr-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'w-8 h-8 rounded-full text-white font-bold text-[11px] inline-flex items-center justify-center flex-shrink-0',
                            avatarColor,
                          )}>
                            {initials(u.email, u.name)}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-ink-strong truncate">
                              {u.name || u.email.split('@')[0]}
                            </div>
                            <div className="text-[12.5px] text-ink-subtle font-mono truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="pl-3! pr-3 py-2.5 text-sm">
                        {u.role
                          ? <Pill color={roleColor(u.role)}>{u.role}</Pill>
                          : <span className="text-ink-faint text-sm">—</span>}
                      </td>
                      <td className="pl-3! pr-3 py-2.5 text-sm font-mono text-ink-default">
                        {u.port_start}–{u.port_end}
                        {u.port_conflict && (
                          <span
                            className="ml-1 text-ochre"
                            title="Port range overlaps another user"
                            aria-label="Port range overlaps another user"
                          >
                            <AlertTriangle size={12} className="inline-block -mt-0.5" />
                          </span>
                        )}
                      </td>
                      <td className="pl-3! pr-3 py-2.5 text-sm">
                        {u.container_running
                          ? <Pill color="forest">running</Pill>
                          : <Pill color="ochre">stopped</Pill>}
                      </td>
                      <td className="pl-3! pr-3 py-2.5 text-sm text-ink-default">{u.classroom_count}</td>
                      <td className="pl-3! pr-3 py-2.5 text-sm text-ink-muted" title={u.last_login || ''}>
                        {fmtRelative(u.last_login)}
                      </td>
                      <td className="pl-3! pr-3 py-2.5 text-sm text-ink-subtle" title={u.first_login || ''}>
                        {fmtRelative(u.first_login)}
                      </td>
                      <td className="pl-3! pr-3 py-2.5 text-right whitespace-nowrap">
                        {(() => {
                          const isSelf = u.email.toLowerCase() === myEmail;
                          const disabled = isSelf;
                          const title = isSelf ? 'You can\'t act on your own account' : '';
                          return (
                            <div className="inline-flex gap-1">
                              <button
                                onClick={() => !disabled && setRoleEditFor(u)}
                                disabled={disabled}
                                className="p-1.5 rounded-md text-ink-muted hover:bg-paper-tinted hover:text-ink-strong disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={title || 'Change role'}
                                aria-label="Change role"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => !disabled && setDeleteFor(u)}
                                disabled={disabled}
                                className="p-1.5 rounded-md text-ink-muted hover:bg-tomato-soft hover:text-tomato disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={title || 'Delete user'}
                                aria-label="Delete user"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="pl-3! pr-3 py-6 text-center text-sm text-ink-muted">
                      No users.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

      {roleEditFor && (
        <ChangeRoleDialog
          user={roleEditFor}
          onClose={() => setRoleEditFor(null)}
          onSave={async (role) => {
            await updateRole(roleEditFor.id, role);
            setRoleEditFor(null);
          }}
        />
      )}
      {deleteFor && (
        <DeleteUserDialog
          user={deleteFor}
          onClose={() => setDeleteFor(null)}
          onConfirm={async () => {
            await deleteUser(deleteFor.id);
            setDeleteFor(null);
          }}
        />
      )}
    </div>
  );
}

function ChangeRoleDialog({
  user, onClose, onSave,
}: {
  user: AdminUser;
  onClose: () => void;
  onSave: (role: string | null) => Promise<void>;
}) {
  const [role, setRole] = useState<string>(user.role || '');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setWorking(true);
    setError(null);
    try {
      await onSave(role === '' ? null : role);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setWorking(false);
    }
  };

  return (
    <DialogShell onClose={onClose} title="Change role">
      <p className="body-sm text-ink-muted mb-4">
        For <span className="font-mono text-ink-strong">{user.email}</span>.
        The user's container will be torn down so the new role's classroom
        symlinks take effect on next attach.
      </p>
      <label className="block text-sm font-semibold text-ink-strong mb-1.5">Role</label>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="w-full px-3 py-2.5 bg-paper border border-rule rounded-md text-ink-strong text-[15px] focus:outline-none focus:border-navy"
      >
        <option value="teacher">teacher</option>
        <option value="student">student</option>
        <option value="">(no role — re-onboard on next sign-in)</option>
      </select>
      {error && <div className="mt-3 text-sm text-tomato">{error}</div>}
      <div className="flex gap-2 justify-end mt-6">
        <GhostButton onClick={onClose} disabled={working}>Cancel</GhostButton>
        <PrimaryButton color="navy" size="md" onClick={submit} disabled={working}>
          {working ? 'Saving…' : 'Save'}
        </PrimaryButton>
      </div>
    </DialogShell>
  );
}

function DeleteUserDialog({
  user, onClose, onConfirm,
}: {
  user: AdminUser;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expected = (user.email.split('@')[0] || user.email).toLowerCase();
  const canConfirm = confirmText.trim().toLowerCase() === expected && !working;

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

  return (
    <DialogShell onClose={onClose} title="Delete user">
      <p className="body-sm text-ink-default mb-3">
        This stops their container, removes their uploads at{' '}
        <code className="font-mono text-xs">/var/lib/csroom/uploads/{user.id}</code>,
        deletes classroom memberships and test results, and removes any empty
        classrooms they own.
      </p>
      {user.classroom_count > 0 && (
        <div className="mb-3 bg-ochre-soft border border-ochre/30 rounded-md px-3 py-2 text-sm text-ink-default">
          Member of {user.classroom_count} classroom{user.classroom_count === 1 ? '' : 's'} — those memberships will be removed.
        </div>
      )}
      <p className="body-sm text-ink-muted mb-4">
        Type <code className="font-mono text-ink-strong">{expected}</code> to confirm.
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
          {working ? 'Deleting…' : 'Delete user'}
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
