import { useEffect, useState } from 'react';
import { LogIn, X } from 'lucide-react';
import { apiUrl } from '../util/UserData';
import { GhostButton, PrimaryButton } from './ui/Buttons';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function JoinClassroomDialog({ open, onClose }: Props) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode('');
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    // Wait 0.5 seconds before checking
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`${apiUrl}/classrooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: trimmed }),
      });
      if (!res.ok) {
        // Try to read specific error message from backend
        try {
          const errData = await res.json();
          if (errData?.error) {
            setError(errData.error);
          } else {
            setError('that code is invalid');
          }
        } catch {
          setError('that code is invalid');
        }
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      if (data.restarted) {
        window.dispatchEvent(
          new CustomEvent('terminal-restart-required', {
            detail: {
              reason: 'classroom-joined',
              classroomId: data.classroom_id,
            },
          }),
        );
      }
      window.dispatchEvent(new CustomEvent('3compute:files-changed'));
      window.dispatchEvent(
        new CustomEvent('classroom-joined', {
          detail: { classroomId: data.classroom_id },
        }),
      );
      onClose();
    } catch {
      setError('that code is invalid');
    } finally {
      setSubmitting(false);
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
          <h2 className="heading-3">Join a classroom</h2>
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
          Enter the six-character access code your teacher shared with you.
        </p>
        <div className="flex flex-col gap-1.5 mb-4">
          <label
            htmlFor="join-classroom-code"
            className="text-sm font-semibold text-ink-strong"
          >
            Access code
          </label>
          <input
            id="join-classroom-code"
            autoFocus
            value={code}
            onChange={(e) => {
              const val = e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 6);
              setCode(val);
            }}
            className="bg-paper border border-rule rounded-md px-3 py-2 text-ink-default placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-navy/30 font-mono uppercase tracking-[0.12em] text-center text-lg"
            placeholder="ABC123"
            maxLength={6}
          />
          {error && (
            <span className="text-xs text-tomato font-semibold">{error}</span>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-rule-soft">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton
            color="forest"
            type="submit"
            disabled={!code || submitting}
            icon={<LogIn size={16} />}
          >
            {submitting ? 'Checking...' : 'Join classroom'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
