import { createContext } from "react";
import { fetchFilesList, Files, FileType } from "./Files";

export interface UserInfo {
  email: string;
  port_start: number;
  port_end: number;
}

export type UserData = {
  userInfo?: UserInfo;
  files?: Files;
  currentFile?: FileType;
  setCurrentFile: React.Dispatch<React.SetStateAction<FileType | undefined>>;
  openFolders: string[];
  setOpenFolders: React.Dispatch<React.SetStateAction<string[]>>;
  refreshFiles: () => Promise<void>;
}

export const backendUrl =
  import.meta.env.VITE_ENVIRONMENT === "production"
    ? import.meta.env.VITE_PROD_BACKEND_URL
    : import.meta.env.VITE_BACKEND_URL;

export async function clientLoader() {
  // Fetch user info to ensure the user is authenticated
  const userRes = await fetch(`${backendUrl}/me`, { credentials: "include" });
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
    location: '/Python app/index.py'
  },
  {
    name: 'requirements.txt',
    location: '/Python app/requirements.txt'
  }
];

const defaultFolder = {
  name: 'Python app',
  location: '/Python app',
  files: defaultFiles
}

export const defaultUserData: UserData = {
  userInfo: undefined,
  files: [defaultFolder],
  currentFile: defaultFiles[0],
  setCurrentFile: () => {},
  openFolders: [defaultFolder.location],
  setOpenFolders: () => {},
  refreshFiles: async () => {}
};

export const UserDataContext = createContext<UserData>(defaultUserData);
