import { useEffect, useState } from 'react';
import { backendUrl } from '../util/UserData';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Classroom {
  id: string;
  name: string;
  access_code?: string;
}

export default function CreateClassroomDialog({ open, onClose }: Props) {
  const [name, setName] = useState('');
  const [existing, setExisting] = useState<Classroom[]>([]);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
      setCreating(false);
      setCreatedCode(null);
      setCopiedId(null);
      fetch(`${backendUrl}/classrooms`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => {
          const owner = Array.isArray(data.owner) ? data.owner : [];
          setExisting(owner);
        })
        .catch(() => {});
    }
  }, [open]);

  const nameTaken =
    name && existing.some((c) => c.name.toLowerCase() === name.toLowerCase());

  const canSubmit = !!name && !nameTaken && !creating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${backendUrl}/classrooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create');
        setCreating(false);
        return;
      }
      const data = await res.json();
      setCreatedCode(data.access_code || null);
      console.log('Created classroom', data);
      if (data.restarted) {
        window.dispatchEvent(
          new CustomEvent('terminal-restart-required', {
            detail: { reason: 'classroom-created', classroomId: data.id },
          }),
        );
      }
      // Keep dialog open to show code and allow copying
      setCreating(false);
    } catch {
      setError('Network error');
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative border border-white/10 rounded-lg shadow-xl w-full max-w-md p-6 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <h2 className="text-lg font-semibold">Create Classroom</h2>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide opacity-70">
            Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`lum-input w-full ${
              nameTaken ? 'border-red-500 focus:border-red-500' : ''
            }`}
            placeholder="Intro to Programming 2025"
          />
          {nameTaken && (
            <span className="text-xs text-red-400">
              You already have a classroom with this name.
            </span>
          )}
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
        {createdCode && (
          <div className="rounded-lum-1 p-3 lum-bg-gray-900/80 border border-green-400/40">
            <div className="text-xs uppercase tracking-wide text-green-200">Access Code</div>
            <div className="flex items-center gap-3 mt-2">
              <code className="px-3 py-2 rounded-lum-1 lum-bg-black/60 tracking-widest text-xl font-semibold text-green-300">
                {createdCode}
              </code>
              <button
                type="button"
                className={`lum-btn flex items-center gap-2 px-3 ${
                  copiedId === createdCode
                    ? 'lum-bg-green-600 hover:lum-bg-green-500'
                    : 'lum-bg-transparent hover:lum-bg-white/10'
                }`}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(createdCode);
                    setCopiedId(createdCode);
                    setTimeout(() => {
                      setCopiedId((prev) => (prev === createdCode ? null : prev));
                    }, 2000);
                  } catch {
                    // Clipboard API failed; intentionally swallow to keep UI responsive
                  }
                }}
              >
                {copiedId === createdCode ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <div className="text-xs opacity-70 mt-2">Share this code with participants to join.</div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          {createdCode ? (
            <button
              type="button"
              onClick={onClose}
              className="lum-btn lum-bg-blue-600 hover:lum-bg-blue-500"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="lum-btn lum-bg-transparent hover:lum-bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={`lum-btn ${
                  canSubmit
                    ? 'lum-bg-blue-600 hover:lum-bg-blue-500'
                    : 'lum-bg-gray-600 opacity-50 cursor-not-allowed'
                }`}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </>
          )}
        </div>
        {!!existing.length && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="text-xs uppercase tracking-wide opacity-70 mb-2">
              Your Classrooms
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-auto pr-1">
              {existing.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-lum-1 lum-bg-gray-900/70 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{c.name}</span>
                    <span className="text-xs opacity-60">{c.id}</span>
                  </div>
                  <button
                    type="button"
                    className={`lum-btn text-xs px-3 ${
                      copiedId === c.id
                        ? 'lum-bg-green-600 hover:lum-bg-green-500'
                        : 'lum-bg-transparent hover:lum-bg-white/10'
                    }`}
                    onClick={async () => {
                      try {
                        const r = await fetch(`${backendUrl}/classrooms/${c.id}/access-code`, {
                          credentials: 'include',
                        });
                        const j = await r.json();
                        const code = j.access_code as string | undefined;
                        if (code) {
                          await navigator.clipboard.writeText(code);
                          setCopiedId(c.id);
                          setTimeout(() => {
                            setCopiedId((prev) => (prev === c.id ? null : prev));
                          }, 2000);
                        }
                      } catch {
                        // Clipboard/API failure while fetching existing code; ignore
                      }
                    }}
                  >
                    {copiedId === c.id ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
