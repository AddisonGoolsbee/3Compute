import { useContext, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';
import AdminSubNav from '../components/AdminSubNav';
import Footer from '../components/Footer';
import { GhostButton, Pill } from '../components/ui/Buttons';

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
  const location = useLocation();
  const [rows, setRows] = useState<AdminContainer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dockerError, setDockerError] = useState<string | null>(null);
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

  const runningCount = rows.filter((r) => r.state === 'running').length;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-7 py-10">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
            <div>
              <h1 className="heading-1">Containers</h1>
              <p className="body-sm mt-1.5">
                {runningCount} running of {rows.length} total. Auto-refreshes every 10s.
                Per-container CPU/mem intentionally omitted to keep this cheap — use{' '}
                <code className="bg-paper-deeper text-ink-default font-mono px-1.5 py-0.5 rounded-sm text-[12.5px]">
                  docker stats
                </code>{' '}
                on the host if you need it.
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
          {dockerError && (
            <div className="mb-4 bg-ochre-soft border border-ochre/30 rounded-md px-4 py-3 text-ochre text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>docker: {dockerError}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full bg-paper-elevated border border-rule-soft rounded-xl overflow-hidden border-collapse">
              <thead>
                <tr className="bg-paper-tinted">
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">User</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">State</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Status</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Uptime</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Ports</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.name} className="border-t border-rule-soft hover:bg-paper-tinted/50 transition-colors">
                    <td className="pl-3! pr-3 py-2.5 text-sm font-mono text-ink-default">
                      {c.user_email || <span className="text-ink-muted">{c.user_id || c.name}</span>}
                    </td>
                    <td className="pl-3! pr-3 py-2.5 text-sm">
                      {c.state === 'running'
                        ? <Pill color="forest">running</Pill>
                        : c.state === 'exited' || c.state === 'stopped'
                          ? <Pill color="ochre">{c.state}</Pill>
                          : <Pill color="tomato">{c.state}</Pill>}
                    </td>
                    <td className="pl-3! pr-3 py-2.5 text-sm text-ink-muted">{c.status}</td>
                    <td className="pl-3! pr-3 py-2.5 text-sm text-ink-default">{c.running_for}</td>
                    <td className="pl-3! pr-3 py-2.5 font-mono text-[12px] text-ink-muted">
                      {c.ports || <span className="text-ink-faint">—</span>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="pl-3! pr-3 py-6 text-center text-sm text-ink-muted">
                      No containers.
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
