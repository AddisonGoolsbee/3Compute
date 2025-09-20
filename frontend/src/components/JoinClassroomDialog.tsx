import { useEffect, useState } from "react";
import { backendUrl } from "../util/UserData";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function JoinClassroomDialog({ open, onClose }: Props) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode("");
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
      const res = await fetch(`${backendUrl}/classrooms/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: trimmed }),
      });
      if (!res.ok) {
        setError("that code is invalid");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      window.dispatchEvent(
        new CustomEvent("classroom-joined", { detail: { classroomId: data.classroom_id } })
      );
      onClose();
    } catch (e) {
      setError("that code is invalid");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative lum-bg-nav-bg border border-white/10 rounded-lg shadow-xl w-full max-w-sm p-5 flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold">Join Classroom</h2>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide opacity-70">
            Access Code
          </label>
          <input
            autoFocus
            value={code}
            onChange={(e) => {
              const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
              setCode(val);
            }}
            className="lum-input w-full"
            placeholder="ABC123"
            maxLength={6}
          />
          {error && (
            <span className="text-xs text-red-400 font-semibold">{error}</span>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="lum-btn lum-bg-transparent hover:lum-bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!code || submitting}
            className={`lum-btn ${
              code && !submitting
                ? "lum-bg-blue-600 hover:lum-bg-blue-500"
                : "lum-bg-gray-600 opacity-50 cursor-not-allowed"
            }`}
          >
            {submitting ? "Checking..." : "Join"}
          </button>
        </div>
      </form>
    </div>
  );
}
