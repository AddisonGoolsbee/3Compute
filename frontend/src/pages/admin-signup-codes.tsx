import { useContext, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { AlertTriangle, Check, Copy, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';
import { useVerifiedAdmin } from '../util/useVerifiedAdmin';
import AdminSubNav from '../components/AdminSubNav';
import Footer from '../components/Footer';
import { GhostButton, Pill, PrimaryButton } from '../components/ui/Buttons';

interface Code {
  id: number;
  code: string;
  role: string;
  notes: string | null;
  expires_at: string | null;
  max_uses: number | null;
  times_used: number;
  created_by: string | null;
  created_at: string | null;
  last_used_at: string | null;
}

export default function AdminSignupCodesPage() {
  const userData = useContext(UserDataContext);
  const location = useLocation();
  const [codes, setCodes] = useState<Code[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const loadRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const [newRole, setNewRole] = useState<'teacher' | 'student'>('student');
  const [newNotes, setNewNotes] = useState('');
  const [newExpires, setNewExpires] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isLoggedIn = !!userData?.userInfo;
  const adminVerified = useVerifiedAdmin(isLoggedIn);
  const isAdmin = adminVerified === true;

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
        const res = await fetch(`${apiUrl}/admin/signup-codes`, { credentials: 'include' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!cancelled) { setCodes(data); setError(null); }
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

  const createCode = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/signup-codes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: newRole,
          notes: newNotes.trim() || null,
          expires_at: newExpires ? new Date(newExpires).toISOString() : null,
          max_uses: newMaxUses ? parseInt(newMaxUses, 10) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `${res.status} ${res.statusText}`);
      }
      setNewNotes('');
      setNewExpires('');
      setNewMaxUses('');
      await loadRef.current();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const deleteCode = async (id: number) => {
    if (!window.confirm('Delete this signup code?')) return;
    const res = await fetch(`${apiUrl}/admin/signup-codes/${id}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (res.ok) await loadRef.current();
  };

  const copyCode = async (c: Code) => {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId((cur) => (cur === c.id ? null : cur)), 1500);
    } catch { /* ignore */ }
  };

  const isExpired = (c: Code) => !!c.expires_at && new Date(c.expires_at) < new Date();
  const isUsedUp = (c: Code) => c.max_uses != null && c.times_used >= c.max_uses;

  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (adminVerified === null) return null;
  if (!isAdmin) return <AdminRestricted />;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-7 py-10">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
            <div>
              <h1 className="heading-1">Signup codes</h1>
              <p className="body-sm mt-1.5">
                Cryptographically random codes a teacher can share with their class. Honored only while
                not expired and under max uses.
              </p>
            </div>
            <GhostButton
              icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => loadRef.current()}
            >Refresh</GhostButton>
          </div>

          <AdminSubNav active={location.pathname} />

          <div className="bg-paper-elevated border border-rule rounded-xl p-5 mb-6">
            <div className="text-sm font-semibold text-ink-strong mb-3">Create new code</div>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'teacher' | 'student')}
                  className="px-3 py-2 bg-paper border border-rule rounded-md text-sm focus:outline-none focus:border-navy"
                >
                  <option value="student">student</option>
                  <option value="teacher">teacher</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-ink-muted mb-1">Notes</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Mrs. Patel's 5th-period class"
                  className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-sm focus:outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">Expires</label>
                <input
                  type="datetime-local"
                  value={newExpires}
                  onChange={(e) => setNewExpires(e.target.value)}
                  className="px-3 py-2 bg-paper border border-rule rounded-md text-sm focus:outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">Max uses</label>
                <input
                  type="number"
                  min={1}
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  placeholder="∞"
                  className="w-24 px-3 py-2 bg-paper border border-rule rounded-md text-sm focus:outline-none focus:border-navy"
                />
              </div>
              <PrimaryButton
                color="navy"
                size="md"
                icon={<Plus size={16} />}
                onClick={createCode}
                disabled={creating}
              >
                Generate
              </PrimaryButton>
            </div>
            {createError && (
              <div className="mt-3 text-sm text-tomato">{createError}</div>
            )}
          </div>

          {loading && codes.length === 0 && (
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
                  <th className="pl-4! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Code</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Role</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Notes</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Uses</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Expires</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Created</th>
                  <th className="pl-3! pr-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-strong"></th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const dead = isExpired(c) || isUsedUp(c);
                  return (
                    <tr key={c.id} className="border-t border-rule-soft hover:bg-paper-tinted/50 transition-colors">
                      <td className="pl-4! pr-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <code className={`text-sm font-mono ${dead ? 'text-ink-faint line-through' : 'text-ink-strong'}`}>
                            {c.code}
                          </code>
                          <button
                            onClick={() => copyCode(c)}
                            className="p-1 rounded text-ink-muted hover:bg-paper-tinted hover:text-ink-strong"
                            title="Copy"
                            aria-label="Copy code"
                          >
                            {copiedId === c.id ? <Check size={13} className="text-forest" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>
                      <td className="pl-3! pr-3 py-2.5 text-sm">
                        <Pill color={c.role === 'teacher' ? 'navy' : 'forest'}>{c.role}</Pill>
                      </td>
                      <td className="pl-3! pr-3 py-2.5 text-sm text-ink-muted">{c.notes || '—'}</td>
                      <td className="pl-3! pr-3 py-2.5 text-sm text-ink-default">
                        {c.times_used}{c.max_uses != null ? ` / ${c.max_uses}` : ''}
                      </td>
                      <td className="pl-3! pr-3 py-2.5 text-sm text-ink-muted" title={c.expires_at || ''}>
                        {c.expires_at ? new Date(c.expires_at).toLocaleString() : 'never'}
                      </td>
                      <td className="pl-3! pr-3 py-2.5 text-sm text-ink-subtle" title={c.created_at || ''}>
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="pl-3! pr-3 py-2.5 text-right">
                        <button
                          onClick={() => deleteCode(c.id)}
                          className="p-1.5 rounded-md text-ink-muted hover:bg-tomato-soft hover:text-tomato transition-colors"
                          aria-label="Delete code"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {codes.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="pl-3! pr-3 py-6 text-center text-sm text-ink-muted">
                      No signup codes yet.
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
