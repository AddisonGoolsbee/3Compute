import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, AlertTriangle, RefreshCw, Play, Pause } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';

interface LogsResponse {
  available: boolean;
  lines?: string[];
  count?: number;
  level?: string;
  error?: string;
}

const LINE_COUNT_OPTIONS = [100, 200, 500, 1000];
const LEVEL_OPTIONS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
type LogLevel = typeof LEVEL_OPTIONS[number];

const DEFAULT_LEVELS: LogLevel[] = ['info', 'warn', 'error', 'fatal'];

export default function AdminLogsPage() {
  const userData = useContext(UserDataContext);
  const [levels, setLevels] = useState<LogLevel[]>(DEFAULT_LEVELS);
  const [lineCount, setLineCount] = useState(200);

  const toggleLevel = (l: LogLevel) => {
    setLevels((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));
  };
  const [lines, setLines] = useState<string[]>([]);
  const [available, setAvailable] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = !!userData?.userInfo?.is_admin;

  useEffect(() => {
    document.documentElement.style.overflowY = 'auto';
    return () => { document.documentElement.style.overflowY = 'hidden'; };
  }, []);

  const load = useMemo(() => async () => {
    setRefreshing(true);
    try {
      const res = await fetch(
        `${apiUrl}/admin/logs?levels=${levels.join(',')}&lines=${lineCount}`,
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
  }, [levels, lineCount]);

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

  if (!isAdmin) {
    return (
      <div className="-mt-20 text-white min-h-screen">
        <div className="pt-32 px-6 max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Admin</h1>
          <p className="text-gray-400">Restricted to Birdflop administrators.</p>
        </div>
      </div>
    );
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
              <h1 className="text-3xl font-bold mb-1">Service logs</h1>
              <p className="text-gray-400 text-sm">
                From <code className="bg-black/30 px-1 rounded">journalctl -u 3compute</code>.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center rounded overflow-hidden border border-gray-700">
                {LEVEL_OPTIONS.map((l) => {
                  const active = levels.includes(l);
                  const activeColor =
                    l === 'debug' ? 'bg-gray-500' :
                    l === 'info' ? 'bg-blue-600' :
                    l === 'warn' ? 'bg-yellow-600' :
                    l === 'error' ? 'bg-red-600' :
                    'bg-red-800';
                  return (
                    <button
                      key={l}
                      onClick={() => toggleLevel(l)}
                      title={active ? `Hide ${l}` : `Show ${l}`}
                      className={`px-3 py-1 capitalize ${active ? `${activeColor} text-white` : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              <select
                value={lineCount}
                onChange={(e) => setLineCount(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200"
              >
                {LINE_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} lines</option>
                ))}
              </select>
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded border transition-colors ${
                  autoRefresh
                    ? 'bg-green-700/40 border-green-600/50 text-green-100 hover:bg-green-700/60'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {autoRefresh ? <Pause size={14} /> : <Play size={14} />}
                Auto 10s
              </button>
              <button
                onClick={load}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pb-12">
        <div className="max-w-6xl mx-auto">
          {loading && lines.length === 0 && <div className="text-gray-500">Loading…</div>}

          {!available && error && (
            <div className="mb-4 rounded-lg border border-yellow-700/50 bg-yellow-950/20 p-3 text-sm text-yellow-200 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {available && lines.length > 0 && (
            <pre
              ref={preRef}
              className="bg-gray-950 border border-gray-800 rounded-lg p-3 overflow-auto font-mono text-[11px] leading-relaxed text-gray-300"
              style={{ maxHeight: 'calc(100vh - 240px)' }}
            >
              {lines.map((line, i) => {
                const isError = /\b(ERROR|Error:|Traceback|OSError|PermissionError|FileNotFoundError|Failed)\b/.test(line);
                const isWarn = /\b(WARN|WARNING|warning)\b/.test(line);
                return (
                  <div
                    key={i}
                    className={
                      isError ? 'text-red-300' :
                        isWarn ? 'text-yellow-300' :
                          undefined
                    }
                  >
                    {line}
                  </div>
                );
              })}
            </pre>
          )}

          {available && lines.length === 0 && !loading && (
            <div className="text-gray-500 text-sm">No lines returned.</div>
          )}
        </div>
      </main>
    </div>
  );
}
