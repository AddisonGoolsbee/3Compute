import { useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import {
  RefreshCw, AlertTriangle, Server, Cpu, HardDrive, Users, Boxes,
  School, Network, Activity,
} from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';
import AdminSubNav from '../components/AdminSubNav';
import Footer from '../components/Footer';
import { GhostButton } from '../components/ui/Buttons';
import { cn } from '../util/cn';

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
  const colorClass =
    tone === 'crit' ? 'bg-tomato' :
      tone === 'warn' ? 'bg-ochre' :
        'bg-forest';
  return (
    <div className="w-full h-2 bg-paper-deeper rounded-full overflow-hidden">
      <div className={cn('h-full transition-all', colorClass)} style={{ width: `${p}%` }} />
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
  const ringClass =
    highlight === 'crit' ? 'ring-2 ring-tomato/60' :
      highlight === 'warn' ? 'ring-2 ring-ochre/50' :
        '';
  return (
    <div className={cn(
      'bg-paper-elevated border border-rule-soft rounded-xl p-5 flex flex-col gap-3 shadow-sm',
      ringClass,
    )}>
      <div className="flex items-center gap-2 text-ink-muted">
        <span className="opacity-70">{icon}</span>
        <h3 className="font-semibold text-xs uppercase tracking-wider">{title}</h3>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-ink-muted uppercase tracking-wider">{label}</span>
      <span className="text-right">
        <span className="text-base font-mono text-ink-strong">{value}</span>
        {sub && <div className="text-[11px] text-ink-subtle font-mono">{sub}</div>}
      </span>
    </div>
  );
}

export default function AdminPage() {
  const userData = useContext(UserDataContext);
  const location = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadRef = useRef<() => Promise<void>>(() => Promise.resolve());

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
    loadRef.current = load;
    load();
    timerRef.current = setInterval(load, 5000);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAdmin]);

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <AdminRestricted />;
  }

  const fdPercent = stats && stats.process.fds.open != null
    ? (stats.process.fds.open / stats.process.fds.soft_limit) * 100
    : 0;
  const fdTone = toneFor(fdPercent);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-7 py-10">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
            <div>
              <h1 className="heading-1">Admin overview</h1>
              <p className="body-sm mt-1.5">
                Live node and service stats. Auto-refreshes every 5s.
              </p>
              {stats && (
                <p className="caption mt-1">
                  Last update {new Date(stats.timestamp * 1000).toLocaleTimeString()}
                </p>
              )}
            </div>
            <GhostButton
              icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => loadRef.current()}
            >
              Refresh
            </GhostButton>
          </div>

          <AdminSubNav active={location.pathname} />

          {loading && !stats && (
            <div className="body text-ink-muted text-center py-10">Loading…</div>
          )}
          {error && (
            <div className="mb-4 bg-tomato-soft border border-tomato/30 rounded-md px-4 py-3 text-tomato text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>Failed to fetch stats: {error}</span>
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                  label="Picked a role"
                  value={stats.users.onboarded}
                  sub={`${stats.users.total > 0 ? Math.round((stats.users.onboarded / stats.users.total) * 100) : 0}% of total`}
                />
                <Stat label="Active (24h)" value={stats.users.active_24h} />
                <Link to="/admin/users" className="text-xs text-navy font-semibold mt-1 hover:underline">
                  View all users →
                </Link>
              </Card>

              <Card title="User containers" icon={<Boxes size={16} />}>
                {stats.containers.error ? (
                  <span className="text-sm text-tomato">Docker error: {stats.containers.error}</span>
                ) : (
                  <>
                    <Stat label="Running" value={stats.containers.running ?? '—'} />
                    <Stat label="Stopped" value={stats.containers.stopped ?? '—'} />
                    <Stat label="Total" value={stats.containers.total ?? '—'} />
                  </>
                )}
                <Link to="/admin/containers" className="text-xs text-navy font-semibold mt-1 hover:underline">
                  View all containers →
                </Link>
              </Card>

              <Card title="Classrooms" icon={<School size={16} />}>
                <Stat label="Total" value={stats.classrooms.total} />
                <Stat label="Memberships" value={stats.classrooms.memberships} />
                <Link to="/admin/classrooms" className="text-xs text-navy font-semibold mt-1 hover:underline">
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
