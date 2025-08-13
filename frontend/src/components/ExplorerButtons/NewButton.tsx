import { File, Folder, Plus } from 'lucide-react';
import { useContext } from 'react';
import { SelectMenuRaw } from '@luminescent/ui-react';
import { UserDataContext } from '../../util/UserData';

export default function NewButton() {
  const userData = useContext(UserDataContext);

  const handleFileClick = () => {
    if (!userData.files) return;
    userData.setIsUserEditingName?.(true);
    const base = computeBasePath(userData.files, userData.selectedLocation);
    // Ensure the base folder is open for visibility
    const folderKey = base.endsWith('/') ? base.slice(0, -1) : base;
    if (folderKey && folderKey !== '/') {
      userData.setOpenFolders((prev) => prev.includes(folderKey) ? prev : [...prev, folderKey]);
    }
    const newFile = {
      name: 'new_file',
      location: `${base}new_file`,
      renaming: true,
      placeholder: true,
    } as const;
    // Insert into nested structure client-side for immediate UX
    const next = insertPlaceholder(userData.files, base, newFile);
    userData.setFilesClientSide(next);
  };

  const handleFolderClick = () => {
    if (!userData.files) return;
    userData.setIsUserEditingName?.(true);
    const base = computeBasePath(userData.files, userData.selectedLocation);
    const newFolder = {
      name: 'new_folder',
      location: `${base}new_folder/`,
      renaming: true,
      files: [],
      placeholder: true,
    } as const;
    const next = insertPlaceholder(userData.files, base, newFolder);
    userData.setFilesClientSide(next);
    userData.setOpenFolders((prev) => prev.includes(base.endsWith('/') ? base.slice(0, -1) : base) ? prev : [...prev, base.endsWith('/') ? base.slice(0, -1) : base]);
  };

  // Helper: immutably insert placeholder under base folder
  function insertPlaceholder(files: any[], base: string, item: any): any[] {
    const normBase = base.endsWith('/') ? base.slice(0, -1) : base;
    if (normBase === '' || normBase === '/') {
      return [...files, item];
    }
    return files.map((f) => {
      if ('files' in f) {
        if (f.location === normBase) {
          return { ...f, files: [...f.files, item] };
        }
        return { ...f, files: insertPlaceholder(f.files, base, item) };
      }
      return f;
    });
  }

  function computeBasePath(files: any[] | undefined, selected?: string) {
    if (!selected) return '/';
    const isFolder = !!findFolderByLocation(files, selected);
    if (isFolder) {
      return selected.endsWith('/') ? selected : `${selected}/`;
    }
    // file selected: return its parent folder path with trailing slash
    const idx = selected.lastIndexOf('/');
    if (idx >= 0) return selected.slice(0, idx + 1) || '/';
    return '/';
  }

  function findFolderByLocation(files: any[] | undefined, loc: string): any | undefined {
    if (!files) return undefined;
    for (const f of files) {
      if ('files' in f) {
        if (f.location === loc || f.location === loc.replace(/\/$/, '')) return f;
        const found = findFolderByLocation(f.files, loc);
        if (found) return found;
      }
    }
    return undefined;
  }

  return <SelectMenuRaw
    id="upload"
    className="lum-btn-p-1 rounded-lum-2 gap-1 text-xs lum-bg-green-950 hover:lum-bg-green-900"
    customDropdown
    dropdown={
      <div className="flex items-center gap-1">
        <Plus size={16} />
        New
      </div>
    }
    extra-buttons={<>
      <button
        onClick={handleFileClick}
        className="lum-btn lum-btn-p-1 rounded-lum-1 gap-1 text-xs lum-bg-transparent"
      >
        <File size={16} />
        File
      </button>
      <button
        onClick={handleFolderClick}
        className="lum-btn lum-btn-p-1 rounded-lum-1 gap-1 text-xs lum-bg-transparent"
      >
        <Folder size={16} />
        Folder
      </button>
    </>}
  />;
}
