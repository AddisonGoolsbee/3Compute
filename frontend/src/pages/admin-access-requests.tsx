import { useContext, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { AlertTriangle, Check, Copy, RefreshCw, X } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';
import AdminSubNav from '../components/AdminSubNav';
import Footer from '../components/Footer';
import { GhostButton, Pill, PrimaryButton } from '../components/ui/Buttons';

interface Request {
  id: number;
  full_name: string;
  school_name: string;
  school_email: string;
  student_access_method: string;
  student_emails_text: string | null;
  is_non_google: boolean;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by_id: string | null;
  admin_notes: string | null;
  generated_code: string | null;
}

const STATUS_COLORS: Record<string, 'ochre' | 'forest' | 'tomato'> = {
  pending: 'ochre',
  approved: 'forest',
  rejected: 'tomato',
};

export default function AdminAccessRequestsPage() {
  const userData = useContext(UserDataContext);
  const location = useLocation();
  const [requests, setRequests] = useState<Request[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
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
        const res = await fetch(`${apiUrl}/access-requests`, { credentials: 'include' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!cancelled) { setRequests(data); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) { setRefreshing(false); setLoading(false); }
      }
    };
    loadRef.current = load;
    load();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const review = async (id: number, action: 'approve' | 'reject', notes: string) => {
    setWorking(id);
    try {
      const res = await fetch(`${apiUrl}/access-requests/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: notes || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `${res.status} ${res.statusText}`);
      }
      await loadRef.current();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setWorking(null);
    }
  };

  const copyCode = async (id: number, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch { /* ignore */ }
  };

  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (!isAdmin) return <AdminRestricted />;

  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-7 py-10">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
            <div>
              <h1 className="heading-1">Access requests</h1>
              <p className="body-sm mt-1.5">
                Teachers who filled out the request form. Approving creates allowlist entries (and a signup
                code if they asked for one).
              </p>
            </div>
            <GhostButton
              icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => loadRef.current()}
            >Refresh</GhostButton>
          </div>

          <AdminSubNav active={location.pathname} />

          {loading && requests.length === 0 && (
            <div className="body text-ink-muted text-center py-10">Loading…</div>
          )}
          {error && (
            <div className="mb-4 bg-tomato-soft border border-tomato/30 rounded-md px-4 py-3 text-tomato text-sm flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <h2 className="heading-3 mb-3">Pending ({pending.length})</h2>
          <div className="flex flex-col gap-4 mb-10">
            {pending.length === 0 && !loading && (
              <div className="bg-paper-elevated border border-rule rounded-xl p-6 text-center text-sm text-ink-muted">
                No pending requests.
              </div>
            )}
            {pending.map((r) => (
              <RequestCard
                key={r.id}
                req={r}
                working={working === r.id}
                onApprove={(notes) => review(r.id, 'approve', notes)}
                onReject={(notes) => review(r.id, 'reject', notes)}
              />
            ))}
          </div>

          {reviewed.length > 0 && (
            <>
              <h2 className="heading-3 mb-3">Reviewed</h2>
              <div className="overflow-x-auto">
                <table className="w-full bg-paper-elevated border border-rule-soft rounded-xl overflow-hidden border-collapse">
                  <thead>
                    <tr className="bg-paper-tinted">
                      <th className="pl-4! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Submitted</th>
                      <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Teacher</th>
                      <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">School</th>
                      <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Method</th>
                      <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Status</th>
                      <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewed.map((r) => (
                      <tr key={r.id} className="border-t border-rule-soft hover:bg-paper-tinted/50 transition-colors">
                        <td className="pl-4! pr-3 py-2.5 text-sm text-ink-muted" title={r.submitted_at || ''}>
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="pl-3! pr-3 py-2.5 text-sm">
                          <div className="text-ink-strong font-semibold">{r.full_name}</div>
                          <div className="text-ink-subtle font-mono text-[12.5px]">{r.school_email}</div>
                        </td>
                        <td className="pl-3! pr-3 py-2.5 text-sm text-ink-default">{r.school_name}</td>
                        <td className="pl-3! pr-3 py-2.5 text-sm text-ink-muted">{r.student_access_method}</td>
                        <td className="pl-3! pr-3 py-2.5 text-sm">
                          <Pill color={STATUS_COLORS[r.status] || 'ochre'}>{r.status}</Pill>
                        </td>
                        <td className="pl-3! pr-3 py-2.5 text-sm">
                          {r.generated_code ? (
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-ink-strong">{r.generated_code}</code>
                              <button
                                onClick={() => copyCode(r.id, r.generated_code!)}
                                className="p-1 rounded text-ink-muted hover:bg-paper-tinted hover:text-ink-strong"
                                title="Copy"
                                aria-label="Copy code"
                              >
                                {copiedId === r.id ? <Check size={13} className="text-forest" /> : <Copy size={13} />}
                              </button>
                            </div>
                          ) : <span className="text-ink-faint">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function RequestCard({
  req, working, onApprove, onReject,
}: {
  req: Request;
  working: boolean;
  onApprove: (notes: string) => void;
  onReject: (notes: string) => void;
}) {
  const [notes, setNotes] = useState('');
  return (
    <div className="bg-paper-elevated border border-rule rounded-xl p-5">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
        <div>
          <div className="font-semibold text-ink-strong text-base">{req.full_name}</div>
          <div className="text-sm text-ink-muted">
            <span className="font-mono">{req.school_email}</span> · {req.school_name}
          </div>
          {req.submitted_at && (
            <div className="text-xs text-ink-faint mt-0.5">
              Submitted {new Date(req.submitted_at).toLocaleString()}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {req.is_non_google && <Pill color="ochre">non-Google</Pill>}
          <Pill color={req.student_access_method === 'code' ? 'plum' : req.student_access_method === 'list' ? 'navy' : 'forest'}>
            {req.student_access_method}
          </Pill>
        </div>
      </div>

      {req.student_access_method === 'list' && req.student_emails_text && (
        <div className="bg-paper border border-rule-soft rounded-md p-3 mb-3">
          <div className="text-xs font-semibold text-ink-muted mb-1">Student emails</div>
          <pre className="text-xs font-mono text-ink-default whitespace-pre-wrap break-all">{req.student_emails_text}</pre>
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-sm focus:outline-none focus:border-navy mb-3"
      />

      <div className="flex gap-2 justify-end">
        <GhostButton
          icon={<X size={14} />}
          onClick={() => onReject(notes)}
          disabled={working}
        >Reject</GhostButton>
        <PrimaryButton
          color="navy"
          size="md"
          icon={<Check size={16} />}
          onClick={() => onApprove(notes)}
          disabled={working}
        >Approve</PrimaryButton>
      </div>
    </div>
  );
}
