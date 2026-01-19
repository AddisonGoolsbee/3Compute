import { createContext } from 'react';
import { backendUrl } from './UserData';

export interface FileType {
  readonly name: string;
  readonly location: string;
  readonly classroomId?: string;
  renaming?: boolean; // Used to indicate if the file is being renamed
  placeholder?: boolean; // Indicates a client-side placeholder prior to creation
}

export interface FolderType extends FileType {
  readonly files: Files;
}

export type Files = (FolderType | FileType)[];

function sortFilesRecursive(items: Files, isTopLevel: boolean = false): void {
  // Sort folders first, then files; both alphabetically (case-insensitive)
  // Exception: archive folder always goes to the bottom at top level
  items.sort((a, b) => {
    const aIsFolder = 'files' in a;
    const bIsFolder = 'files' in b;

    // Archive folder always at bottom (only at top level)
    if (isTopLevel) {
      if (a.name === 'archive') return 1;
      if (b.name === 'archive') return -1;
    }

    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  // Recurse into folders
  for (const item of items) {
    if ('files' in item) {
      sortFilesRecursive(item.files, false);
    }
  }
}

export type FilesResponse = {
  files: Files;
  classroomSymlinks: Record<string, { id: string; name?: string; archived?: boolean; isInstructor?: boolean }>;
};

export async function fetchFilesList(): Promise<FilesResponse> {
  // Fetch the list of files
  const fileRes = await fetch(`${backendUrl}/list-files`, {
    credentials: 'include',
  });
  if (!fileRes.ok) return { files: [], classroomSymlinks: {} };
  const filesData: {
    files: string[];
    classroomMeta?: Record<string, { id: string; name?: string; archived?: boolean; isInstructor?: boolean }>;
  } = await fileRes.json();
  const classroomSymlinks = filesData.classroomMeta || {};

  // Construct the files structure
  const files: Files = [];
  for (let i = 0; i < filesData.files.length; i++) {
    // split by the slashes and then put them into an object
    const parts = filesData.files[i].split('/');
    let current = files;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === '') continue; // skip empty parts (e.g. leading slash)

      // if the part already exists, we just continue
      const existing = current.find((f) => f.name === part);
      if (existing) {
        if ('files' in existing) {
          current = existing.files;
        } else {
          current = [];
        }
        continue;
      }

      // if it's the last part, we create a file
      if (i === parts.length - 1) {
        const location = `/${parts.slice(0, i + 1).join('/')}`;
        const classroomMeta = classroomSymlinks[parts[0]];
        current.push({
          name: part,
          location,
          classroomId: classroomMeta?.id,
        } as FileType);
        continue;
      }

      // otherwise we create a folder
      const existingFolder = current.find(
        (f) => 'files' in f && f.name === part,
      );
      if (existingFolder && 'files' in existingFolder) {
        current = existingFolder.files;
        continue;
      }
      // create a new folder
      const classroomMeta = classroomSymlinks[parts[0]];
      const folder: FolderType = {
        name: part,
        location: `/${parts.slice(0, i + 1).join('/')}`,
        files: [],
        ...(classroomMeta?.id ? { classroomId: classroomMeta.id } : {}),
      } as FolderType;
      current.push(folder);
      current = folder.files;
    }
  }

  // Ensure stable alphabetical ordering
  sortFilesRecursive(files, true);

  return { files, classroomSymlinks };
}

export interface StatusContextType {
  status: string | null;
  setStatus: (status: string | null) => void;
}

export const StatusContext = createContext<StatusContextType>({
  status: null,
  setStatus: () => {},
});