import { createContext, Dispatch, SetStateAction } from 'react';
import { fetchFilesList, Files, FileType } from './Files';

export interface UserInfo {
  email: string;
  role: string | null;
  port_start: number;
  port_end: number;
  needs_onboarding: boolean;
}

export type StudentViewContext = {
  classroomId: string;
  studentEmail: string;
  templateName: string;
};

export type UserData = {
  userInfo?: UserInfo;
  files?: Files;
  classroomSymlinks?: Record<string, { id: string; name?: string; archived?: boolean; isInstructor?: boolean }>;
  setFilesClientSide: Dispatch<SetStateAction<Files | undefined>>;
  currentFile?: FileType;
  setCurrentFile: Dispatch<SetStateAction<FileType | undefined>>;
  openFolders: string[];
  setOpenFolders: Dispatch<SetStateAction<string[]>>;
  refreshFiles: (force?: boolean) => Promise<void>;
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
    blankSpace?: boolean;
  };
  setContextMenu: Dispatch<SetStateAction<{
    visible: boolean;
    x: number;
    y: number;
    targetLocation?: string;
    blankSpace?: boolean;
  }>>;
  studentView?: StudentViewContext;
  setStudentView?: Dispatch<SetStateAction<StudentViewContext | undefined>>;
  clipboardLocation?: string;
  setClipboardLocation?: Dispatch<SetStateAction<string | undefined>>;
};

export const backendUrl =
  import.meta.env.VITE_ENVIRONMENT === 'production'
    ? import.meta.env.VITE_PROD_BACKEND_URL
    : import.meta.env.VITE_BACKEND_URL;

export const apiUrl = `${backendUrl}/api`;

export async function clientLoader() {
  let userRes;
  try {
    userRes = await fetch(`${apiUrl}/auth/me`, { credentials: 'include' });
  } catch {
    return {};
  }
  if (!userRes.ok) return {};
  const userInfo: UserInfo = await userRes.json();

  let files: Files = [];
  let classroomSymlinks: Record<string, { id: string; name?: string; archived?: boolean; isInstructor?: boolean }> = {};
  try {
    const result = await fetchFilesList();
    files = result.files;
    classroomSymlinks = result.classroomSymlinks;
  } catch {
    // Backend may be unreachable; continue with empty file list
  }

  return {
    userInfo,
    files,
    classroomSymlinks,
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
  classroomSymlinks: {},
  clipboardLocation: undefined,
  setClipboardLocation: () => {},
};

export const UserDataContext = createContext<UserData>(defaultUserData);
