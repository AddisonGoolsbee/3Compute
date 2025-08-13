import { useContext, useState } from 'react';
import { FolderIcon } from 'lucide-react';
import { backendUrl, defaultUserData, UserDataContext } from '../util/UserData';
import UploadButton from './ExplorerButtons/UploadButton';
import NewButton from './ExplorerButtons/NewButton';
import MenuItems from './MenuItems';
import TemplateButton from './ExplorerButtons/TemplateButton';
import { getClasses } from '@luminescent/ui-react';
import { StatusContext } from '../util/Files';

export default function Explorer() {
  const userData = useContext(UserDataContext);
  const [status, setStatus] = useState<string | null>(null);

  return <StatusContext value={{ status, setStatus }}>
    <div className="flex max-w-1/4 flex-1 flex-col lum-card gap-1 p-1 lum-bg-gray-950 border-lum-border/30">
      <div className={getClasses({
        'transition-all duration-500 flex flex-col gap-1 p-1 lum-bg-gray-900 rounded-lum-1': true,
        'rounded-b-sm': !!status,
      })}>
        <div className="flex items-center gap-1 lum-btn-p-1">
          <FolderIcon size={16} />
          <span className="ml-1">
            File Explorer
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <UploadButton />
          <NewButton />
          <TemplateButton />
          {/*<GitButton />*/}
        </div>
      </div>
      <div className={getClasses({
        'transition-all duration-500 flex items-center gap-2 p-1 pl-2 lum-bg-gray-900 rounded-lum-1 rounded-t-sm': true,
        '-mt-8 opacity-0 pointer-events-none': !status,
      })}>
        <div className="lum-loading w-4 h-4 m-0.5 border-2" />
        <span className="flex-1">
          {status}
        </span>
      </div>
      <div
        className="flex-1 overflow-auto"
        onClick={(e) => {
          // Deselect when clicking blank space within the list area
          if ((e.target as HTMLElement).closest('[data-explorer-item]')) return;
          userData.setSelectedLocation?.(undefined);
        }}
        onDragOver={(e) => {
          // Allow dropping to root only when hovering blank space (not over an item)
          if ((e.target as HTMLElement).closest('[data-explorer-item]')) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          (e.currentTarget as HTMLElement).classList.add('ring-1', 'ring-blue-400/30');
        }}
        onDragLeave={(e) => {
          (e.currentTarget as HTMLElement).classList.remove('ring-1', 'ring-blue-400/30');
        }}
        onDragEnd={(e) => {
          (e.currentTarget as HTMLElement).classList.remove('ring-1', 'ring-blue-400/30');
        }}
        onDrop={async (e) => {
          // Only handle drop to root if not dropped on an item
          if ((e.target as HTMLElement).closest('[data-explorer-item]')) return;
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove('ring-1', 'ring-blue-400/30');
          let source = e.dataTransfer.getData('text/x-3compute-source');
          if (!source) source = e.dataTransfer.getData('text/plain');
          if (!source) return;
          const srcName = source.split('/').filter(Boolean).pop() || '';
          const destination = `/${srcName}${source.endsWith('/') ? '/' : ''}`;
          if (destination === source) return;
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
          let res = await fetch(`${backendUrl}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ source, destination }),
          });
          if (res.status === 409) {
            const confirmed = window.confirm(`A file or folder named "${srcName}" already exists at root. Replace it? This cannot be undone.`);
            if (!confirmed) return;
            res = await fetch(`${backendUrl}/move`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ source, destination, overwrite: true }),
            });
          }
          if (res.ok) {
            await userData.refreshFiles();
          } else {
            const text = await res.text().catch(() => '');
            console.error('Move to root failed', res.status, text);
          }
        }}
      >
        {Array.isArray(userData?.files) ? (
          <MenuItems files={userData?.files} />
        ) : userData?.userInfo ? (
          <div className="text-red-500">Error loading files</div>
        ) : (
          <MenuItems files={defaultUserData.files} />
        )}
      </div>
    </div>
  </StatusContext>;
}
