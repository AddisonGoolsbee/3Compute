import { useEffect, useMemo, useState } from 'react';
import { FileText, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { apiUrl } from '../util/UserData';

interface Props {
  open: boolean;
  classroomId: string;
  templateName: string;
  files: string[];
  onClose: () => void;
}

type PendingRestore =
  | { kind: 'single'; path: string }
  | { kind: 'all' }
  | null;

export default function AssignmentBrowserDialog({
  open,
  classroomId,
  templateName,
  files,
  onClose,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [binary, setBinary] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingRestore>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null);

  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => a.localeCompare(b)),
    [files],
  );

  useEffect(() => {
    if (!open) return;
    setSelected(sortedFiles[0] ?? null);
    setPending(null);
    setRestoreError(null);
    setRestoredMessage(null);
  }, [open, sortedFiles]);

  useEffect(() => {
    if (!open || !selected) {
      setContent('');
      setBinary(false);
      setContentError(null);
      return;
    }
    let cancelled = false;
    setLoadingContent(true);
    setContentError(null);
    fetch(
      `${apiUrl}/classrooms/${classroomId}/assignments/${encodeURIComponent(
        templateName,
      )}/file?path=${encodeURIComponent(selected)}`,
      { credentials: 'include' },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setContent(data.content ?? '');
        setBinary(!!data.binary);
      })
      .catch((e) => {
        if (cancelled) return;
        setContentError(String(e?.message ?? e));
      })
      .finally(() => {
        if (!cancelled) setLoadingContent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, classroomId, templateName, selected]);

  const doRestore = async (paths: string[] | null) => {
    setRestoring(true);
    setRestoreError(null);
    setRestoredMessage(null);
    try {
      const res = await fetch(
        `${apiUrl}/classrooms/${classroomId}/assignments/${encodeURIComponent(
          templateName,
        )}/restore`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      const count = data.count ?? 0;
      setRestoredMessage(
        count === 1 ? 'Restored 1 file.' : `Restored ${count} files.`,
      );
      window.dispatchEvent(new CustomEvent('3compute:files-changed'));
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setRestoring(false);
      setPending(null);
    }
  };

  if (!open) return null;

  const confirmMessage =
    pending?.kind === 'all'
      ? `Restore all ${sortedFiles.length} files in "${templateName}"? Your current copies will be overwritten with the originals. This cannot be undone.`
      : pending?.kind === 'single'
        ? `Restore "${pending.path}"? Your current copy will be overwritten with the original. This cannot be undone.`
        : '';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative border border-white/10 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col lum-bg-nav-bg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-gray-400 shrink-0" />
            <h2 className="text-base font-semibold truncate">{templateName}</h2>
            <span className="text-xs text-gray-500 shrink-0">
              {sortedFiles.length} {sortedFiles.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPending({ kind: 'all' })}
              disabled={restoring || sortedFiles.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw size={12} />
              Restore all
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {restoredMessage && (
          <div className="px-5 py-2 text-xs text-emerald-300 bg-emerald-900/20 border-b border-emerald-900/40">
            {restoredMessage}
          </div>
        )}
        {restoreError && (
          <div className="px-5 py-2 text-xs text-red-300 bg-red-900/20 border-b border-red-900/40">
            {restoreError}
          </div>
        )}

        <div className="flex-1 flex min-h-0">
          <div className="w-64 shrink-0 border-r border-white/10 overflow-y-auto">
            {sortedFiles.length === 0 ? (
              <div className="p-4 text-xs text-gray-500">No files.</div>
            ) : (
              <ul className="flex flex-col">
                {sortedFiles.map((f) => (
                  <li
                    key={f}
                    className={`group flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer ${
                      selected === f
                        ? 'bg-white/10 text-white'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                    onClick={() => setSelected(f)}
                  >
                    <span className="flex-1 truncate font-mono" title={f}>
                      {f}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPending({ kind: 'single', path: f });
                      }}
                      disabled={restoring}
                      title={`Restore ${f}`}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-gray-400 hover:text-amber-300 disabled:opacity-40"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            {selected ? (
              <>
                <div className="px-4 py-2 border-b border-white/10 text-xs font-mono text-gray-400 truncate">
                  {selected}
                </div>
                <div className="flex-1 overflow-auto">
                  {loadingContent ? (
                    <div className="p-4 text-xs text-gray-500">Loading…</div>
                  ) : contentError ? (
                    <div className="p-4 text-xs text-red-400">
                      Failed to load: {contentError}
                    </div>
                  ) : binary ? (
                    <div className="p-4 text-xs text-gray-500 italic">
                      Binary file — preview unavailable.
                    </div>
                  ) : (
                    <pre className="p-4 text-xs leading-relaxed font-mono whitespace-pre text-gray-200">
                      {content}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
                Select a file to preview.
              </div>
            )}
          </div>
        </div>

        {pending && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg"
            onClick={() => !restoring && setPending(null)}
          >
            <div
              className="border border-amber-600/40 rounded-lg shadow-xl w-full max-w-md p-5 flex flex-col gap-4 lum-bg-nav-bg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={20}
                  className="text-amber-400 shrink-0 mt-0.5"
                />
                <div className="flex flex-col gap-1 min-w-0">
                  <h3 className="text-sm font-semibold">Confirm restore</h3>
                  <p className="text-xs text-gray-300">{confirmMessage}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setPending(null)}
                  disabled={restoring}
                  className="lum-btn lum-bg-transparent hover:lum-bg-white/10 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    doRestore(
                      pending.kind === 'all' ? null : [pending.path],
                    )
                  }
                  disabled={restoring}
                  className="lum-btn lum-bg-amber-600 hover:lum-bg-amber-500 text-xs"
                >
                  {restoring
                    ? 'Restoring…'
                    : pending.kind === 'all'
                      ? 'Restore all'
                      : 'Restore'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
