import { useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';

interface AdminContainer {
  name: string;
  user_id: string | null;
  user_email: string | null;
  state: string;
  status: string;
  running_for: string;
  ports: string;
}

export default function AdminContainersPage() {
  const userData = useContext(UserDataContext);
  const [rows, setRows] = useState<AdminContainer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dockerError, setDockerError] = useState<string | null>(null);
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
        const res = await fetch(`${apiUrl}/admin/containers`, { credentials: 'include' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!cancelled) {
          setRows(data.containers || []);
          setDockerError(data.error || null);
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

  const runningCount = rows.filter((r) => r.state === 'running').length;

  return (
    <div className="-mt-20 text-white min-h-screen flex flex-col">
      <header className="pt-24 pb-4 px-6">
        <div className="max-w-6xl mx-auto">
          <Link to="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft size={18} /> Back to admin
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold mb-1">
                Containers ({runningCount} running / {rows.length} total)
              </h1>
              <p className="text-gray-400 text-sm">
                Auto-refreshes every 10s. Per-container CPU/mem intentionally omitted to keep this cheap —
                use <code className="bg-black/30 px-1 rounded">docker stats</code> on the host if you need it.
              </p>
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
          {loading && rows.length === 0 && <div className="text-gray-500">Loading…</div>}
          {error && (
            <div className="mb-4 rounded-lg border border-red-700/50 bg-red-950/30 p-3 text-sm text-red-300 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}
          {dockerError && (
            <div className="mb-4 rounded-lg border border-yellow-700/50 bg-yellow-950/20 p-3 text-sm text-yellow-200 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> docker: {dockerError}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/40">
            <table className="w-full text-sm">
              <thead className="text-left bg-gray-900/60 text-gray-400 uppercase text-[10px] tracking-wide">
                <tr>
                  <th className="pl-3! pr-3 py-2">User</th>
                  <th className="pl-3! pr-3 py-2">State</th>
                  <th className="pl-3! pr-3 py-2">Status</th>
                  <th className="pl-3! pr-3 py-2">Uptime</th>
                  <th className="pl-3! pr-3 py-2">Ports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {rows.map((c) => (
                  <tr key={c.name} className="hover:bg-gray-800/30">
                    <td className="pl-3! pr-3 py-2 font-mono text-xs">
                      {c.user_email || <span className="text-gray-500">{c.user_id || c.name}</span>}
                    </td>
                    <td className="pl-3! pr-3 py-2">
                      {c.state === 'running' ? (
                        <span className="inline-flex items-center gap-1 text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> running
                        </span>
                      ) : (
                        <span className="text-gray-500">{c.state}</span>
                      )}
                    </td>
                    <td className="pl-3! pr-3 py-2 text-gray-400">{c.status}</td>
                    <td className="pl-3! pr-3 py-2 text-gray-300">{c.running_for}</td>
                    <td className="pl-3! pr-3 py-2 font-mono text-[10px] text-gray-400">{c.ports || <span className="text-gray-600">—</span>}</td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr><td colSpan={5} className="pl-3! pr-3 py-6 text-center text-gray-500">No containers.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
