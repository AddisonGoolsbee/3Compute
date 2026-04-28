import { useContext, useState } from 'react';
import { Folder, Eye, EyeOff, Loader2 } from 'lucide-react';
import { apiUrl, defaultUserData, UserDataContext } from '../util/UserData';
import UploadButton from './ExplorerButtons/UploadButton';
import NewButton from './ExplorerButtons/NewButton';
import MenuItems from './MenuItems';
import { cn } from '../util/cn';
import { StatusContext, getShowHidden, setShowHidden } from '../util/Files';
import { uploadLocalFiles } from '../util/uploadLocalFiles';

export default function Explorer() {
  const userData = useContext(UserDataContext);
  const [status, setStatus] = useState<string | null>(null);
  const [showHidden, setShowHiddenState] = useState<boolean>(() => getShowHidden());

  const toggleShowHidden = () => {
    const next = !showHidden;
    setShowHiddenState(next);
    setShowHidden(next);
    userData.refreshFiles();
  };

  return <StatusContext value={{ status, setStatus }}>
    <div className="flex flex-col h-full w-full bg-ide-bg border border-ide-rule rounded-lg p-1.5 gap-1.5">
      <div className="flex flex-col gap-1.5 p-1.5 bg-ide-elevated rounded-md">
        <div className="flex items-center gap-2 px-1 py-0.5">
          <Folder size={15} className="text-ochre" />
          <span className="text-sm font-semibold text-ink-strong">Files</span>
          <button
            onClick={toggleShowHidden}
            title={showHidden ? 'Hide hidden files' : 'Show hidden files'}
            aria-label={showHidden ? 'Hide hidden files' : 'Show hidden files'}
            className="ml-auto p-1 rounded hover:bg-paper-tinted text-ink-muted hover:text-ink-strong transition-colors"
            aria-pressed={showHidden}
          >
            {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <UploadButton />
          <NewButton />
        </div>
      </div>
      <div
        className={cn(
          'transition-all duration-500 flex items-center gap-2 p-1 pl-2 bg-paper-tinted rounded-md',
          !status && '-mt-8 opacity-0 pointer-events-none',
        )}
      >
        <Loader2 size={14} className="animate-spin text-ink-muted" />
        <span className="flex-1 text-sm text-ink-default">
          {status}
        </span>
      </div>
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide p-0.5"
        onClick={(e) => {
          // Deselect when clicking blank space within the list area
          if ((e.target as HTMLElement).closest('[data-explorer-item]')) return;
          userData.setSelectedLocation?.(undefined);
        }}
        onContextMenu={(e) => {
          // Only handle blank-space right-clicks (not on file/folder items)
          if ((e.target as HTMLElement).closest('[data-explorer-item]')) return;
          e.preventDefault();
          // Find the nearest parent folder container to determine paste target
          const folderContainer = (e.target as HTMLElement).closest('[data-folder-location]');
          const targetLocation = folderContainer
            ? (folderContainer as HTMLElement).dataset.folderLocation!
            : '/';
          userData.setSelectedLocation?.(undefined);
          userData.setContextMenu?.({ visible: true, x: e.clientX, y: e.clientY, targetLocation, blankSpace: true });
        }}
        onDragOver={(e) => {
          // Only bow out when hovering a folder row (which handles the drop
          // itself). File rows and blank space both mean "drop at root".
          if ((e.target as HTMLElement).closest('[data-kind="folder"]')) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = e.dataTransfer.types.includes('Files') ? 'copy' : 'move';
          (e.currentTarget as HTMLElement).classList.add('ring-1', 'ring-navy/30');
        }}
        onDragLeave={(e) => {
          (e.currentTarget as HTMLElement).classList.remove('ring-1', 'ring-navy/30');
        }}
        onDragEnd={(e) => {
          (e.currentTarget as HTMLElement).classList.remove('ring-1', 'ring-navy/30');
        }}
        onDrop={async (e) => {
          // Drops on folder rows are handled by the folder itself; anything
          // else (file rows, blank space) falls through to this handler.
          if ((e.target as HTMLElement).closest('[data-kind="folder"]')) return;
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove('ring-1', 'ring-navy/30');
          // Determine the destination folder: if the drop target is inside a
          // folder's contents container (e.g. between two sibling files in an
          // expanded folder), use that folder; otherwise fall back to root.
          const folderTarget = (e.target as HTMLElement).closest('[data-folder-location]') as HTMLElement | null;
          const parentLocation = folderTarget?.dataset.folderLocation || '/';
          const parentBase = parentLocation === '/' || parentLocation === ''
            ? ''
            : parentLocation.replace(/\/$/, '');
          // Handle OS file drops
          if (e.dataTransfer.files.length > 0) {
            const uploadBase = parentLocation === '/' || parentLocation === ''
              ? '/'
              : `${parentBase}/`;
            await uploadLocalFiles(e.dataTransfer.files, uploadBase, apiUrl, setStatus, userData.refreshFiles);
            return;
          }
          let source = e.dataTransfer.getData('text/x-csroom-source');
          if (!source) source = e.dataTransfer.getData('text/plain');
          if (!source) return;
          const srcName = source.split('/').filter(Boolean).pop() || '';
          const destination = `${parentBase}/${srcName}${source.endsWith('/') ? '/' : ''}`;
          if (destination === source) return;
          // Don't let a folder be moved into itself or its own subtree.
          if (source.endsWith('/') && (parentBase + '/').startsWith(source)) return;
          // Update open editor file path if it is the moved item or within it
          if (userData.currentFile?.location) {
            const currentLoc = userData.currentFile.location;
            if (currentLoc === source) {
              userData.setCurrentFile({ name: userData.currentFile.name || srcName, location: destination });
              userData.setSelectedLocation?.(destination);
            } else if (source.endsWith('/') && currentLoc.startsWith(source)) {
              const suffix = currentLoc.slice(source.length);
              const newLoc = `${destination}${suffix}`;
              userData.setCurrentFile({ name: userData.currentFile.name, location: newLoc });
            }
          }
          userData.setOpenFiles((prev) => prev.map((f) => {
            if (f.location === source) return { ...f, name: srcName, location: destination };
            if (source.endsWith('/') && f.location.startsWith(source)) {
              return { ...f, location: `${destination}${f.location.slice(source.length)}` };
            }
            return f;
          }));
          let res = await fetch(`${apiUrl}/files/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ source, destination }),
          });
          if (res.status === 409) {
            const where = parentLocation === '/' || parentLocation === '' ? 'at root' : `in "${parentLocation}"`;
            const confirmed = window.confirm(`A file or folder named "${srcName}" already exists ${where}. Replace it? This cannot be undone.`);
            if (!confirmed) return;
            res = await fetch(`${apiUrl}/files/move`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ source, destination, overwrite: true }),
            });
          }
          if (res.ok) {
            userData.setContentVersion?.((v) => (v ?? 0) + 1);
            await userData.refreshFiles();
          } else {
            const text = await res.text().catch(() => '');
            console.error('Move to root failed', res.status, text);
            try {
              const errObj = JSON.parse(text);
              alert(`Move failed: ${errObj.error || text}`);
            } catch {
              alert(`Move failed: ${text || res.statusText}`);
            }
          }
        }}
      >
        {Array.isArray(userData?.files) ? (
          <MenuItems files={userData?.files} />
        ) : userData?.userInfo ? (
          <div className="text-tomato text-sm px-2">Error loading files</div>
        ) : (
          <MenuItems files={defaultUserData.files} />
        )}
      </div>
    </div>
  </StatusContext>;
}
