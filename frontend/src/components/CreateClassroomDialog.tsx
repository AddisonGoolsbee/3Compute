import { useEffect, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { apiUrl } from '../util/UserData';
import { GhostButton, PrimaryButton } from './ui/Buttons';

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
      fetch(`${apiUrl}/classrooms`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => {
          const owner = Array.isArray(data.owner) ? data.owner : [];
          setExisting(owner);
        })
        .catch(() => {});
    }
  }, [open]);

  const nameTaken =
    !!name && existing.some((c) => c.name.toLowerCase() === name.toLowerCase());

  const canSubmit = !!name.trim() && !nameTaken && !creating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/classrooms/`, {
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
      window.dispatchEvent(new CustomEvent('3compute:files-changed'));
      window.dispatchEvent(
        new CustomEvent('terminal-restart-required', {
          detail: { reason: 'classroom-created', classroomId: data.id },
        }),
      );
      // Keep dialog open to show code and allow copying
      setCreating(false);
    } catch {
      setError('Network error');
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink-strong/60 flex items-center justify-center p-7">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <form
        onSubmit={handleSubmit}
        className="relative bg-paper-elevated border border-rule-soft rounded-xl shadow-lg p-7 max-w-[480px] w-full"
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <h2 className="heading-3">Create a classroom</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-muted hover:text-ink-strong p-1 rounded hover:bg-paper-tinted transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <p className="body-sm text-ink-muted mb-4">
          Give your classroom a name. Students join with the access code we generate next.
        </p>
        <div className="flex flex-col gap-1.5 mb-4">
          <label
            htmlFor="create-classroom-name"
            className="text-sm font-semibold text-ink-strong"
          >
            Name
          </label>
          <input
            id="create-classroom-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`bg-paper border rounded-md px-3 py-2 text-ink-default placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-navy/30 ${
              nameTaken ? 'border-tomato' : 'border-rule'
            }`}
            placeholder="Intro to programming 2025"
          />
          {nameTaken && (
            <span className="text-xs text-tomato">
              You already have a classroom with this name.
            </span>
          )}
          {error && <span className="text-xs text-tomato">{error}</span>}
        </div>
        {createdCode && (
          <div className="rounded-lg p-4 bg-forest-soft border border-forest/30 mb-2">
            <div className="eyebrow text-forest">Access code</div>
            <div className="flex items-center gap-3 mt-2">
              <code className="px-3 py-2 rounded-md bg-paper-elevated border border-rule-soft tracking-[0.18em] text-xl font-semibold text-forest font-mono">
                {createdCode}
              </code>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold text-forest bg-paper-elevated border border-rule-soft hover:bg-paper-tinted transition-colors"
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
                {copiedId === createdCode ? (
                  <>
                    <Check size={14} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy code
                  </>
                )}
              </button>
            </div>
            <div className="text-xs text-ink-muted mt-2">
              Share this code with participants to join.
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-rule-soft">
          {createdCode ? (
            <PrimaryButton color="navy" onClick={onClose}>
              Done
            </PrimaryButton>
          ) : (
            <>
              <GhostButton onClick={onClose}>Cancel</GhostButton>
              <PrimaryButton
                color="navy"
                type="submit"
                disabled={!canSubmit}
              >
                {creating ? 'Creating...' : 'Create classroom'}
              </PrimaryButton>
            </>
          )}
        </div>
        {!!existing.length && (
          <div className="mt-6 border-t border-rule-soft pt-5">
            <div className="eyebrow text-ink-muted mb-3">Your classrooms</div>
            <div className="flex flex-col gap-2 max-h-48 overflow-auto pr-1">
              {existing.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-paper-tinted border border-rule-soft px-3 py-2"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-ink-strong truncate">
                      {c.name}
                    </span>
                    <span className="text-xs text-ink-subtle truncate">{c.id}</span>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-ink-strong bg-paper-elevated border border-rule-soft hover:bg-paper-tinted transition-colors shrink-0"
                    onClick={async () => {
                      try {
                        const r = await fetch(
                          `${apiUrl}/classrooms/${c.id}/access-code`,
                          { credentials: 'include' },
                        );
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
                    {copiedId === c.id ? (
                      <>
                        <Check size={12} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copy code
                      </>
                    )}
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
