import { Files, Folder, Upload } from 'lucide-react';
import { useRef, useContext, useState, useEffect } from 'react';
import { apiUrl, UserDataContext } from '../../util/UserData';
import { StatusContext } from '../../util/Files';
import { cn } from '../../util/cn';

export default function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { setStatus } = useContext(StatusContext);
  const userData = useContext(UserDataContext);

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  const handleFileClick = () => fileInputRef.current?.click();
  const handleFolderClick = () => folderInputRef.current?.click();

  const handleFiles = async (fileList: FileList | null, isFolder: boolean) => {
    if (!fileList || fileList.length === 0) return;

    setStatus('Uploading...');
    setOpen(false);

    const formData = new FormData();
    Array.from(fileList).forEach((file) => {
      formData.append('files', file, file.webkitRelativePath || file.name);
    });

    const endpoint = isFolder
      ? `${apiUrl}/files/upload-folder`
      : `${apiUrl}/files/upload`;

    // Add a timeout so we don't hang forever on network/proxy issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 minutes

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal,
      });

      setStatus(res.ok ? 'Upload successful' : 'Upload failed');
      if (res.status === 413) {
        setStatus('Failed: File too large');
      }
      if (res.ok) {
        await userData.refreshFiles();
      }
    } catch {
      // Network error, timeout, or abort
      setStatus('Upload failed: network error');
    } finally {
      clearTimeout(timeoutId);
      setTimeout(() => setStatus(null), 1000);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bg-paper-elevated text-ink-default border border-ide-rule px-2 py-1.5 rounded-sm text-xs font-medium cursor-pointer font-sans inline-flex items-center justify-center gap-1.5 hover:bg-paper-tinted transition-colors w-full"
      >
        <Upload size={12} />
        Upload
      </button>
      <div
        className={cn(
          'absolute left-0 top-full mt-1 bg-paper-elevated border border-rule-soft rounded-md shadow-md py-1.5 min-w-[10rem] z-50 transition-opacity duration-150',
          !open && 'opacity-0 pointer-events-none',
        )}
      >
        <button
          type="button"
          onClick={handleFileClick}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-default hover:bg-paper-tinted hover:text-ink-strong cursor-pointer w-full text-left"
        >
          <Files size={14} className="text-ink-muted" />
          Files
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files, false)}
          className="hidden"
          multiple
        />
        <button
          type="button"
          onClick={handleFolderClick}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-default hover:bg-paper-tinted hover:text-ink-strong cursor-pointer w-full text-left"
        >
          <Folder size={14} className="text-ochre" />
          Folder
        </button>
        <input
          type="file"
          ref={folderInputRef}
          onChange={(e) => handleFiles(e.target.files, true)}
          className="hidden"
          // @ts-expect-error webkitdirectory is not supported in all browsers
          webkitdirectory=""
          directory=""
        />
      </div>
    </div>
  );
}
