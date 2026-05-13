import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { apiUrl } from '../util/UserData';
import { GhostButton, PrimaryButton } from './ui/Buttons';
import { Dialog } from './a11y/Dialog';

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
      window.dispatchEvent(new CustomEvent('csroom:files-changed'));
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Join a classroom"
      description="Enter the six-character access code your teacher shared with you."
    >
      <form onSubmit={handleSubmit}>
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
    </Dialog>
  );
}
