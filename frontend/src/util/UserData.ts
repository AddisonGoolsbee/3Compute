import { createContext, Dispatch, SetStateAction } from 'react';
import { fetchFilesList, Files, FileType } from './Files';

export interface UserInfo {
  email: string;
  picture?: string;
  name: string;
  port_start: number;
  port_end: number;
}

export type UserData = {
  userInfo?: UserInfo;
  files?: Files;
  setFilesClientSide: Dispatch<SetStateAction<Files | undefined>>;
  currentFile?: FileType;
  setCurrentFile: Dispatch<SetStateAction<FileType | undefined>>;
  openFolders: string[];
  setOpenFolders: Dispatch<SetStateAction<string[]>>;
  refreshFiles: (preserveLocation?: string) => Promise<void>;
  isUserEditingName?: boolean;
  setIsUserEditingName?: Dispatch<SetStateAction<boolean>>;
  selectedLocation?: string;
  setSelectedLocation?: Dispatch<SetStateAction<string | undefined>>;
  dragOverLocation?: string;
  setDragOverLocation?: Dispatch<SetStateAction<string | undefined>>;
  contentVersion?: number;
  setContentVersion?: Dispatch<SetStateAction<number>>;
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    targetLocation?: string;
  };
  setContextMenu: Dispatch<SetStateAction<{
    visible: boolean;
    x: number;
    y: number;
    targetLocation?: string;
  }>>;
}

export const backendUrl =
  import.meta.env.VITE_ENVIRONMENT === 'production'
    ? import.meta.env.VITE_PROD_BACKEND_URL
    : import.meta.env.VITE_BACKEND_URL;

export async function clientLoader() {
  // Fetch user info to ensure the user is authenticated
  const userRes = await fetch(`${backendUrl}/me`, { credentials: 'include' });
  if (!userRes.ok) return {};
  const userInfo: UserInfo = await userRes.json();

  const files = await fetchFilesList();

  return {
    userInfo,
    files,
  };
}

const defaultFiles = [
  {
    name: 'index.py',
    location: '/Python app/index.py',
  },
  {
    name: 'requirements.txt',
    location: '/Python app/requirements.txt',
  },
];

const defaultFolder = {
  name: 'Python app',
  location: '/Python app',
  files: defaultFiles,
};

export const defaultUserData: UserData = {
  userInfo: undefined,
  files: [defaultFolder],
  setFilesClientSide: () => {},
  currentFile: defaultFiles[0],
  setCurrentFile: () => {},
  openFolders: [defaultFolder.location],
  setOpenFolders: () => {},
  refreshFiles: async () => {},
  isUserEditingName: false,
  setIsUserEditingName: () => {},
  selectedLocation: defaultFiles[0].location,
  setSelectedLocation: () => {},
  dragOverLocation: undefined,
  setDragOverLocation: () => {},
  contentVersion: 0,
  setContentVersion: () => {},
  contextMenu: { visible: false, x: 0, y: 0, targetLocation: undefined },
  setContextMenu: () => {},
};

export const UserDataContext = createContext<UserData>(defaultUserData);
