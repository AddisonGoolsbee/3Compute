import { useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';

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

export default function AdminUsersPage() {
  const userData = useContext(UserDataContext);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    <div className="-mt-20 text-white min-h-screen flex flex-col">
      <header className="pt-24 pb-4 px-6">
        <div className="max-w-6xl mx-auto">
          <Link to="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft size={18} /> Back to admin
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold mb-1">Users ({users.length})</h1>
              <p className="text-gray-400 text-sm">Auto-refreshes every 10s.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Idle'}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          {loading && users.length === 0 && <div className="text-gray-500">Loading…</div>}
          {error && (
            <div className="mb-4 rounded-lg border border-red-700/50 bg-red-950/30 p-3 text-sm text-red-300 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {conflictUsers.length > 0 && (
            <div className="mb-4 rounded-lg border border-yellow-700/50 bg-yellow-950/20 p-3 text-sm text-yellow-200 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Port range overlap detected</div>
                <div className="text-yellow-300/80 text-xs mt-1">
                  {conflictUsers.map((u) => u.email).join(', ')}.
                  Fix via <code className="bg-black/30 px-1 rounded">fix-stuck-user.md</code> — a signup race can
                  produce this and the second container will fail to spawn.
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/40">
            <table className="w-full text-sm">
              <thead className="text-left bg-gray-900/60 text-gray-400 uppercase text-[10px] tracking-wide">
                <tr>
                  <th className="pl-3! pr-3 py-2">Email</th>
                  <th className="pl-3! pr-3 py-2">Role</th>
                  <th className="pl-3! pr-3 py-2">Ports</th>
                  <th className="pl-3! pr-3 py-2">Container</th>
                  <th className="pl-3! pr-3 py-2">Classes</th>
                  <th className="pl-3! pr-3 py-2">Last login</th>
                  <th className="pl-3! pr-3 py-2">First login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/30">
                    <td className="pl-3! pr-3 py-2 font-mono">
                      {u.email}
                      {u.name && <span className="text-gray-500 ml-1">({u.name})</span>}
                    </td>
                    <td className="pl-3! pr-3 py-2 text-gray-300">{u.role || <span className="text-gray-500">—</span>}</td>
                    <td className="pl-3! pr-3 py-2 font-mono text-gray-300">
                      {u.port_start}–{u.port_end}
                      {u.port_conflict && (
                        <span className="ml-1 text-yellow-400" title="Port range overlaps another user">⚠</span>
                      )}
                    </td>
                    <td className="pl-3! pr-3 py-2">
                      {u.container_running ? (
                        <span className="inline-flex items-center gap-1 text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> running
                        </span>
                      ) : (
                        <span className="text-gray-500">stopped</span>
                      )}
                    </td>
                    <td className="pl-3! pr-3 py-2 text-gray-300">{u.classroom_count}</td>
                    <td className="pl-3! pr-3 py-2 text-gray-400" title={u.last_login || ''}>{fmtRelative(u.last_login)}</td>
                    <td className="pl-3! pr-3 py-2 text-gray-500" title={u.first_login || ''}>{fmtRelative(u.first_login)}</td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr><td colSpan={7} className="pl-3! pr-3 py-6 text-center text-gray-500">No users.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
