import { useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';

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

export default function AdminClassroomsPage() {
  const userData = useContext(UserDataContext);
  const [rows, setRows] = useState<AdminClassroom[]>([]);
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
    <div className="-mt-20 text-white min-h-screen flex flex-col">
      <header className="pt-24 pb-4 px-6">
        <div className="max-w-6xl mx-auto">
          <Link to="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft size={18} /> Back to admin
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold mb-1">Classrooms ({rows.length})</h1>
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
          {loading && rows.length === 0 && <div className="text-gray-500">Loading…</div>}
          {error && (
            <div className="mb-4 rounded-lg border border-red-700/50 bg-red-950/30 p-3 text-sm text-red-300 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/40">
            <table className="w-full text-sm">
              <thead className="text-left bg-gray-900/60 text-gray-400 uppercase text-[10px] tracking-wide">
                <tr>
                  <th className="pl-3! pr-3 py-2">Name</th>
                  <th className="pl-3! pr-3 py-2">Code</th>
                  <th className="pl-3! pr-3 py-2">Owner</th>
                  <th className="pl-3! pr-3 py-2">Instructors</th>
                  <th className="pl-3! pr-3 py-2">Students</th>
                  <th className="pl-3! pr-3 py-2">Assignments</th>
                  <th className="pl-3! pr-3 py-2">Grading</th>
                  <th className="pl-3! pr-3 py-2">Joins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/30">
                    <td className="pl-3! pr-3 py-2">{c.name}</td>
                    <td className="pl-3! pr-3 py-2 font-mono text-gray-400">{c.access_code}</td>
                    <td className="pl-3! pr-3 py-2 font-mono text-gray-300">{c.created_by_email || <span className="text-gray-500">—</span>}</td>
                    <td className="pl-3! pr-3 py-2 text-gray-300">{c.instructor_count}</td>
                    <td className="pl-3! pr-3 py-2 text-gray-300">{c.participant_count}</td>
                    <td className="pl-3! pr-3 py-2 text-gray-300">{c.assignment_count}</td>
                    <td className="pl-3! pr-3 py-2 text-gray-400">{c.grading_mode}</td>
                    <td className="pl-3! pr-3 py-2">
                      {c.joins_paused
                        ? <span className="text-yellow-400">paused</span>
                        : <span className="text-gray-500">open</span>}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr><td colSpan={8} className="pl-3! pr-3 py-6 text-center text-gray-500">No classrooms.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
