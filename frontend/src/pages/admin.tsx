import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, RefreshCw, AlertTriangle, Server, Cpu, HardDrive, Users, Boxes, School, Network, Activity } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import Footer from '../components/Footer';

interface Stats {
  host: {
    cpu_percent: number;
    memory: { total_mb: number; used_mb: number; percent: number };
    disk: { total_gb: number; used_gb: number; percent: number };
    load_avg: { '1m': number | null; '5m': number | null; '15m': number | null };
    uptime_seconds: number;
  };
  process: {
    pid: number;
    uptime_seconds: number;
    cpu_percent: number | null;
    memory_rss_mb: number;
    threads: number;
    fds: { open: number | null; soft_limit: number; hard_limit: number };
  };
  users: { total: number; onboarded: number; active_24h: number };
  containers: { total: number | null; running: number | null; stopped: number | null; error?: string };
  classrooms: { total: number; memberships: number };
  subdomains: { total: number };
  ports: { base: number | null; max_allocated_end: number | null; allocated_users: number };
  timestamp: number;
}

function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Bar({ percent, tone }: { percent: number; tone?: 'ok' | 'warn' | 'crit' }) {
  const p = Math.max(0, Math.min(100, percent));
  const color =
    tone === 'crit' ? 'bg-red-500' :
      tone === 'warn' ? 'bg-yellow-500' :
        'bg-blue-500';
  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all`} style={{ width: `${p}%` }} />
    </div>
  );
}

function toneFor(percent: number): 'ok' | 'warn' | 'crit' {
  if (percent >= 90) return 'crit';
  if (percent >= 75) return 'warn';
  return 'ok';
}

function Card({
  title,
  icon,
  children,
  highlight,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  highlight?: 'crit' | 'warn' | null;
}) {
  const ring =
    highlight === 'crit' ? 'ring-2 ring-red-500/60' :
      highlight === 'warn' ? 'ring-2 ring-yellow-500/50' :
        '';
  return (
    <div className={`bg-gray-900/50 border border-gray-800 rounded-lg p-4 flex flex-col gap-3 ${ring}`}>
      <div className="flex items-center gap-2 text-gray-300">
        <span className="opacity-70">{icon}</span>
        <h3 className="font-semibold text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-right">
        <span className="text-base font-mono text-white">{value}</span>
        {sub && <div className="text-[10px] text-gray-500 font-mono">{sub}</div>}
      </span>
    </div>
  );
}

export default function AdminPage() {
  const userData = useContext(UserDataContext);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = !!userData?.userInfo?.is_admin;
  const isLoggedIn = !!userData?.userInfo;

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
        const res = await fetch(`${apiUrl}/admin/stats`, { credentials: 'include' });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`${res.status} ${body || res.statusText}`);
        }
        const data = (await res.json()) as Stats;
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) {
          setRefreshing(false);
          setLoading(false);
        }
      }
    };
    load();
    timerRef.current = setInterval(load, 5000);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAdmin]);

  if (!isLoggedIn) {
    return (
      <div className="-mt-20 text-white min-h-screen flex flex-col">
        <div className="pt-32 px-6 max-w-3xl mx-auto w-full">
          <h1 className="text-2xl font-bold mb-2">Admin</h1>
          <p className="text-gray-400">You must be logged in to view this page.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="-mt-20 text-white min-h-screen flex flex-col">
        <div className="pt-32 px-6 max-w-3xl mx-auto w-full">
          <h1 className="text-2xl font-bold mb-2">Admin</h1>
          <p className="text-gray-400">This page is restricted to Birdflop administrators.</p>
        </div>
      </div>
    );
  }

  const fdPercent = stats && stats.process.fds.open != null
    ? (stats.process.fds.open / stats.process.fds.soft_limit) * 100
    : 0;
  const fdTone = toneFor(fdPercent);

  return (
    <div className="-mt-20 text-white min-h-screen flex flex-col">
      <header className="pt-24 pb-4 px-6">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/ide"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            Back to IDE
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold mb-1">Admin dashboard</h1>
              <p className="text-gray-400 text-sm">
                Live node + service stats. Auto-refreshes every 5s.
                {stats && (
                  <span className="ml-2 text-gray-500">
                    Last update: {new Date(stats.timestamp * 1000).toLocaleTimeString()}
                  </span>
                )}
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
          {loading && !stats && (
            <div className="text-gray-500">Loading…</div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-700/50 bg-red-950/30 p-3 text-sm text-red-300 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>Failed to fetch stats: {error}</span>
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card
                title="Backend process"
                icon={<Activity size={16} />}
                highlight={fdTone === 'crit' ? 'crit' : fdTone === 'warn' ? 'warn' : null}
              >
                <Stat
                  label="Open file descriptors"
                  value={
                    stats.process.fds.open != null
                      ? `${stats.process.fds.open} / ${stats.process.fds.soft_limit}`
                      : 'unknown'
                  }
                  sub={`soft ${stats.process.fds.soft_limit} · hard ${stats.process.fds.hard_limit}`}
                />
                {stats.process.fds.open != null && (
                  <Bar percent={fdPercent} tone={fdTone} />
                )}
                <Stat label="Uptime" value={fmtDuration(stats.process.uptime_seconds)} />
                <Stat label="Memory (RSS)" value={`${stats.process.memory_rss_mb} MB`} />
                <Stat
                  label="CPU"
                  value={stats.process.cpu_percent != null ? `${stats.process.cpu_percent.toFixed(1)}%` : '—'}
                />
                <Stat label="Threads" value={stats.process.threads} />
                <Stat label="PID" value={stats.process.pid} />
              </Card>

              <Card title="Host CPU / load" icon={<Cpu size={16} />}>
                <Stat label="CPU" value={`${stats.host.cpu_percent.toFixed(1)}%`} />
                <Bar percent={stats.host.cpu_percent} tone={toneFor(stats.host.cpu_percent)} />
                <Stat
                  label="Load avg"
                  value={
                    stats.host.load_avg['1m'] != null
                      ? `${stats.host.load_avg['1m']!.toFixed(2)}`
                      : '—'
                  }
                  sub={
                    stats.host.load_avg['5m'] != null
                      ? `5m ${stats.host.load_avg['5m']!.toFixed(2)} · 15m ${stats.host.load_avg['15m']!.toFixed(2)}`
                      : undefined
                  }
                />
                <Stat label="Host uptime" value={fmtDuration(stats.host.uptime_seconds)} />
              </Card>

              <Card
                title="Memory"
                icon={<Server size={16} />}
                highlight={stats.host.memory.percent >= 90 ? 'crit' : stats.host.memory.percent >= 75 ? 'warn' : null}
              >
                <Stat
                  label="Used"
                  value={`${(stats.host.memory.used_mb / 1024).toFixed(1)} GB`}
                  sub={`of ${(stats.host.memory.total_mb / 1024).toFixed(1)} GB`}
                />
                <Bar percent={stats.host.memory.percent} tone={toneFor(stats.host.memory.percent)} />
                <Stat label="Utilization" value={`${stats.host.memory.percent.toFixed(1)}%`} />
              </Card>

              <Card
                title="Disk (/)"
                icon={<HardDrive size={16} />}
                highlight={stats.host.disk.percent >= 90 ? 'crit' : stats.host.disk.percent >= 75 ? 'warn' : null}
              >
                <Stat
                  label="Used"
                  value={`${stats.host.disk.used_gb} GB`}
                  sub={`of ${stats.host.disk.total_gb} GB`}
                />
                <Bar percent={stats.host.disk.percent} tone={toneFor(stats.host.disk.percent)} />
                <Stat label="Utilization" value={`${stats.host.disk.percent.toFixed(1)}%`} />
              </Card>

              <Card title="Users" icon={<Users size={16} />}>
                <Stat label="Total accounts" value={stats.users.total} />
                <Stat
                  label="Onboarded"
                  value={stats.users.onboarded}
                  sub={`${stats.users.total > 0 ? Math.round((stats.users.onboarded / stats.users.total) * 100) : 0}% of total`}
                />
                <Stat label="Active (24h)" value={stats.users.active_24h} />
                <Link to="/admin/users" className="text-xs text-blue-400 hover:text-blue-300 mt-1">
                  View all users →
                </Link>
              </Card>

              <Card title="User containers" icon={<Boxes size={16} />}>
                {stats.containers.error ? (
                  <span className="text-sm text-red-300">Docker error: {stats.containers.error}</span>
                ) : (
                  <>
                    <Stat label="Running" value={stats.containers.running ?? '—'} />
                    <Stat label="Stopped" value={stats.containers.stopped ?? '—'} />
                    <Stat label="Total" value={stats.containers.total ?? '—'} />
                  </>
                )}
                <Link to="/admin/containers" className="text-xs text-blue-400 hover:text-blue-300 mt-1">
                  View all containers →
                </Link>
              </Card>

              <Card title="Classrooms" icon={<School size={16} />}>
                <Stat label="Total" value={stats.classrooms.total} />
                <Stat label="Memberships" value={stats.classrooms.memberships} />
                <Link to="/admin/classrooms" className="text-xs text-blue-400 hover:text-blue-300 mt-1">
                  View all classrooms →
                </Link>
              </Card>

              <Card title="Subdomains + ports" icon={<Network size={16} />}>
                <Stat label="Subdomains" value={stats.subdomains.total} />
                <Stat
                  label="Port allocation"
                  value={
                    stats.ports.base != null
                      ? `${stats.ports.base}–${stats.ports.max_allocated_end ?? stats.ports.base}`
                      : '—'
                  }
                  sub={`${stats.ports.allocated_users} users`}
                />
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
