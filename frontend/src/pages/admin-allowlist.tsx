import { useContext, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { AlertTriangle, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { apiUrl, UserDataContext } from '../util/UserData';
import AdminRestricted from '../components/AdminRestricted';
import { useVerifiedAdmin } from '../util/useVerifiedAdmin';
import AdminSubNav from '../components/AdminSubNav';
import Footer from '../components/Footer';
import { GhostButton, Pill, PrimaryButton } from '../components/ui/Buttons';

interface Entry {
  id: number;
  pattern: string;
  role: string;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
}

export default function AdminAllowlistPage() {
  const userData = useContext(UserDataContext);
  const location = useLocation();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // New-entry form state
  const [newPattern, setNewPattern] = useState('');
  const [newRole, setNewRole] = useState<'teacher' | 'student'>('teacher');
  const [newNotes, setNewNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
        const res = await fetch(`${apiUrl}/admin/allowlist`, { credentials: 'include' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!cancelled) { setEntries(data); setError(null); }
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

  const addEntry = async () => {
    if (!newPattern.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`${apiUrl}/admin/allowlist`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern: newPattern.trim(),
          role: newRole,
          notes: newNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `${res.status} ${res.statusText}`);
      }
      setNewPattern('');
      setNewNotes('');
      await loadRef.current();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const deleteEntry = async (id: number) => {
    if (!window.confirm('Delete this allowlist entry?')) return;
    const res = await fetch(`${apiUrl}/admin/allowlist/${id}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (res.ok) await loadRef.current();
  };

  if (!isLoggedIn) return <Navigate to="/" replace />;
  if (adminVerified === null) return null;
  if (!isAdmin) return <AdminRestricted />;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-7 py-10">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-7">
            <div>
              <h1 className="heading-1">Allowlist</h1>
              <p className="body-sm mt-1.5">
                Patterns granting role access. Empty list = only @birdflop.com admins can sign in.
                Supports exact emails or fnmatch globs like <code className="font-mono">*@school.edu</code>.
              </p>
            </div>
            <GhostButton
              icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => loadRef.current()}
            >Refresh</GhostButton>
          </div>

          <AdminSubNav active={location.pathname} />

          {/* Add form */}
          <div className="bg-paper-elevated border border-rule rounded-xl p-5 mb-6">
            <div className="text-sm font-semibold text-ink-strong mb-3">Add entry</div>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-semibold text-ink-muted mb-1">Pattern</label>
                <input
                  type="text"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  placeholder="user@school.edu or *@school.edu"
                  className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-sm font-mono focus:outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'teacher' | 'student')}
                  className="px-3 py-2 bg-paper border border-rule rounded-md text-sm focus:outline-none focus:border-navy"
                >
                  <option value="teacher">teacher</option>
                  <option value="student">student</option>
                </select>
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs font-semibold text-ink-muted mb-1">Notes</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="optional"
                  className="w-full px-3 py-2 bg-paper border border-rule rounded-md text-sm focus:outline-none focus:border-navy"
                />
              </div>
              <PrimaryButton
                color="navy"
                size="md"
                icon={<Plus size={16} />}
                onClick={addEntry}
                disabled={adding || !newPattern.trim()}
              >
                Add
              </PrimaryButton>
            </div>
            {addError && (
              <div className="mt-3 text-sm text-tomato">{addError}</div>
            )}
          </div>

          {loading && entries.length === 0 && (
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
                  <th className="pl-4! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Pattern</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Role</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Notes</th>
                  <th className="pl-3! pr-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-strong">Added</th>
                  <th className="pl-3! pr-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-strong"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-rule-soft hover:bg-paper-tinted/50 transition-colors">
                    <td className="pl-4! pr-3 py-2.5 text-sm font-mono text-ink-strong">{e.pattern}</td>
                    <td className="pl-3! pr-3 py-2.5 text-sm">
                      <Pill color={e.role === 'teacher' ? 'navy' : 'forest'}>{e.role}</Pill>
                    </td>
                    <td className="pl-3! pr-3 py-2.5 text-sm text-ink-muted">{e.notes || '—'}</td>
                    <td className="pl-3! pr-3 py-2.5 text-sm text-ink-subtle" title={e.created_at || ''}>
                      {e.created_at ? new Date(e.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="pl-3! pr-3 py-2.5 text-right">
                      <button
                        onClick={() => deleteEntry(e.id)}
                        className="p-1.5 rounded-md text-ink-muted hover:bg-tomato-soft hover:text-tomato transition-colors"
                        aria-label="Delete entry"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="pl-3! pr-3 py-6 text-center text-sm text-ink-muted">
                      No allowlist entries yet. Only @birdflop.com admins can sign in.
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
