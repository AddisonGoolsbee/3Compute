import { Files, Folder, Upload } from 'lucide-react';
import { useRef, useContext, useState, useEffect } from 'react';
import { apiUrl, UserDataContext } from '../../util/UserData';
import { StatusContext, type Files as FileTree } from '../../util/Files';
import { uploadFolderFiles, uploadLocalFiles } from '../../util/uploadLocalFiles';
import { cn } from '../../util/cn';

/**
 * Resolve the upload destination from the explorer's selected item.
 *
 * - If a folder is selected, upload into it.
 * - If a file is selected, upload into the file's parent folder.
 * - If nothing is selected (or the path can't be resolved), upload to root.
 *
 * Returns a path without leading/trailing slashes (the format the backend's
 * /files/upload `destination` form field expects), or empty string for root.
 */
function resolveUploadDestination(
  selectedLocation: string | undefined,
  tree: FileTree | undefined,
): string {
  if (!selectedLocation || selectedLocation === '/' || !tree) return '';
  const findItem = (items: FileTree, loc: string): { isFolder: boolean } | null => {
    for (const item of items) {
      if (item.location === loc) return { isFolder: 'files' in item };
      if ('files' in item) {
        const found = findItem(item.files, loc);
        if (found) return found;
      }
    }
    return null;
  };
  const match = findItem(tree, selectedLocation);
  // If we couldn't find the item, fall back to root rather than risking a
  // path that points at a file (the backend would try to mkdir over it).
  if (!match) return '';
  const folderPath = match.isFolder
    ? selectedLocation
    : selectedLocation.slice(0, selectedLocation.lastIndexOf('/')) || '/';
  return folderPath.replace(/^\/|\/$/g, '');
}

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
    setOpen(false);

    const destination = resolveUploadDestination(userData.selectedLocation, userData.files);

    // File mode shares uploadLocalFiles with drag-and-drop so the 409
    // "Replace?" prompt is consistent across both entry points.
    if (!isFolder) {
      const destPath = destination ? `/${destination}/` : '/';
      await uploadLocalFiles(fileList, destPath, apiUrl, setStatus, userData.refreshFiles);
      return;
    }

    // Folder mode shares uploadFolderFiles with drag-and-drop so the 409
    // "Replace?" prompt is consistent across both entry points.
    const entries = Array.from(fileList).map((file) => ({
      file,
      path: file.webkitRelativePath || file.name,
    }));
    const destPath = destination ? `/${destination}/` : '/';
    await uploadFolderFiles(entries, destPath, apiUrl, setStatus, userData.refreshFiles);
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
