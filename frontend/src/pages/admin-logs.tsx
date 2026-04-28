import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { AlertTriangle, RefreshCw, Play, Pause } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';
import Footer from '../components/Footer';
import { GhostButton, Pill } from '../components/ui/Buttons';
import { cn } from '../util/cn';

interface LogsResponse {
  available: boolean;
  lines?: string[];
  count?: number;
  error?: string;
}

const LINE_COUNT_OPTIONS = [100, 200, 500, 1000];

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

function classifyLine(line: string): 'error' | 'warn' | 'debug' | 'info' {
  if (/\b(ERROR|CRITICAL|Error:|Traceback|OSError|PermissionError|FileNotFoundError|Failed)\b/.test(line)) {
    return 'error';
  }
  if (/\b(WARN|WARNING|warning)\b/.test(line)) return 'warn';
  if (/\b(DEBUG|TRACE)\b/.test(line)) return 'debug';
  return 'info';
}

export default function AdminLogsPage() {
  const userData = useContext(UserDataContext);
  const location = useLocation();
  const [hideDebug, setHideDebug] = useState(true);
  const [hideInfo, setHideInfo] = useState(false);
  const [lineCount, setLineCount] = useState(200);
  const [lines, setLines] = useState<string[]>([]);
  const [available, setAvailable] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLoggedIn = !!userData?.userInfo;
  const isAdmin = !!userData?.userInfo?.is_admin;

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => { document.documentElement.style.overflowY = 'hidden'; };
  }, []);

  const load = useMemo(() => async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({
        lines: String(lineCount),
        hide_debug: hideDebug ? 'true' : 'false',
        hide_info: hideInfo ? 'true' : 'false',
      });
      const res = await fetch(
        `${apiUrl}/admin/logs?${params.toString()}`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data: LogsResponse = await res.json();
      setAvailable(data.available);
      setLines(data.lines || []);
      setError(data.error || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setAvailable(false);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [hideDebug, hideInfo, lineCount]);

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, load]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoRefresh && isAdmin) {
      timerRef.current = setInterval(load, 10_000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, isAdmin, load]);

  // Auto-scroll to bottom when lines change and auto-refresh is on.
  useEffect(() => {
    if (autoRefresh && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [lines, autoRefresh]);

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
              <h1 className="heading-1">Service logs</h1>
              <p className="body-sm mt-1.5">
                From{' '}
                <code className="bg-paper-deeper text-ink-default font-mono px-1.5 py-0.5 rounded-sm text-[12.5px]">
                  journalctl -u csroom
                </code>
                .
              </p>
            </div>
            <GhostButton
              icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
              onClick={load}
            >
              Refresh
            </GhostButton>
          </div>

          <SubNav active={location.pathname} />

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="caption">Severity</span>
              <button
                type="button"
                onClick={() => setHideInfo((v) => !v)}
                className="cursor-pointer"
                aria-pressed={!hideInfo}
              >
                {hideInfo
                  ? <Pill color="navy">info hidden</Pill>
                  : <Pill color="forest">info shown</Pill>}
              </button>
              <button
                type="button"
                onClick={() => setHideDebug((v) => !v)}
                className="cursor-pointer"
                aria-pressed={!hideDebug}
              >
                {hideDebug
                  ? <Pill color="navy">debug hidden</Pill>
                  : <Pill color="plum">debug shown</Pill>}
              </button>
            </div>

            <select
              value={lineCount}
              onChange={(e) => setLineCount(Number(e.target.value))}
              className="bg-paper border border-rule rounded-md px-3 py-2 text-sm text-ink-default focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              {LINE_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} lines</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-colors',
                autoRefresh
                  ? 'bg-forest-soft text-forest border border-forest/30 hover:brightness-95'
                  : 'bg-paper border border-rule text-ink-default hover:bg-paper-tinted',
              )}
            >
              {autoRefresh ? <Pause size={14} /> : <Play size={14} />}
              Auto 10s
            </button>
          </div>

          {loading && lines.length === 0 && (
            <div className="body text-ink-muted text-center py-10">Loading…</div>
          )}

          {!available && error && (
            <div className="mb-4 bg-ochre-soft border border-ochre/30 rounded-md px-4 py-3 text-ochre text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {available && lines.length > 0 && (
            <pre
              ref={preRef}
              className="bg-ide-bg border border-ide-rule rounded-lg p-4 font-mono text-[13px] text-ink-default overflow-auto max-h-[70vh] whitespace-pre-wrap"
            >
              {lines.map((line, i) => {
                const kind = classifyLine(line);
                const cls =
                  kind === 'error' ? 'text-tomato' :
                    kind === 'warn' ? 'text-ochre' :
                      kind === 'debug' ? 'text-ink-muted' :
                        'text-ink-default';
                return (
                  <span key={i} className={cn('block', cls)}>
                    {line}
                  </span>
                );
              })}
            </pre>
          )}

          {available && lines.length === 0 && !loading && (
            <div className="body-sm text-ink-muted">No lines returned.</div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
