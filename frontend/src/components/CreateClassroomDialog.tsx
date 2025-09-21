import { useEffect, useState } from "react";
import { backendUrl } from "../util/UserData";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Classroom {
  id: string;
  name: string;
}

export default function CreateClassroomDialog({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [existing, setExisting] = useState<Classroom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
      setCreating(false);
      fetch(`${backendUrl}/classrooms`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => setExisting(data.classrooms || []))
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create");
        setCreating(false);
        return;
      }
      const data = await res.json();
      console.log("Created classroom", data);
      if (data.restarted) {
        window.dispatchEvent(
          new CustomEvent("terminal-restart-required", {
            detail: { reason: "classroom-created", classroomId: data.id },
          })
        );
      }
      onClose();
    } catch (err) {
      setError("Network error");
      setCreating(false);
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
              nameTaken ? "border-red-500 focus:border-red-500" : ""
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
            disabled={!canSubmit}
            className={`lum-btn ${
              canSubmit
                ? "lum-bg-blue-600 hover:lum-bg-blue-500"
                : "lum-bg-gray-600 opacity-50 cursor-not-allowed"
            }`}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
