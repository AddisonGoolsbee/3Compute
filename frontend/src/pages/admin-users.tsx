import { useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';
import Footer from '../components/Footer';
import { GhostButton, Pill } from '../components/ui/Buttons';
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

const SUB_NAV: Array<{ label: string; to: string }> = [
  { label: 'Overview', to: '/admin' },
  { label: 'Users', to: '/admin/users' },
  { label: 'Classrooms', to: '/admin/classrooms' },
  { label: 'Containers', to: '/admin/containers' },
  { label: 'Logs', to: '/admin/logs' },
];

function SubNav({ active }: { active: string }) {
  return (
    <div className="flex gap-1 mb-7 border-b border-rule-soft">
      {SUB_NAV.map((tab) => {
        const isActive = tab.to === active;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'px-4 py-2.5 border-b-2 -mb-px text-sm font-semibold transition-colors',
              isActive
                ? 'border-navy text-ink-strong'
                : 'border-transparent text-ink-muted hover:text-ink-strong',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
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
  const isAdmin = !!userData?.userInfo?.is_admin;

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

          <SubNav active={location.pathname} />

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
                    </tr>
                  );
                })}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="pl-3! pr-3 py-6 text-center text-sm text-ink-muted">
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
    </div>
  );
}
