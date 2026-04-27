import { useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';
import Footer from '../components/Footer';
import { GhostButton, Pill } from '../components/ui/Buttons';
import { cn } from '../util/cn';

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

          <SubNav active={location.pathname} />

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
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="pl-3! pr-3 py-6 text-center text-sm text-ink-muted">
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
    </div>
  );
}
