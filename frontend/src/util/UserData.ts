import { createContext } from "react";

export interface UserInfo {
  email: string;
  port_start: number;
  port_end: number;
}
export declare interface File {
    readonly name: string;
    readonly location: string;
}
export declare interface Folder extends File {
    readonly files: (Folder | File)[];
}

export type UserData = {
  userInfo?: UserInfo
  files?: (Folder | File)[];
}

const backendUrl = import.meta.env.VITE_ENVIRONMENT === "production"
  ? import.meta.env.VITE_PROD_BACKEND_URL
  : import.meta.env.VITE_BACKEND_URL;

export async function clientLoader() {
  // Fetch user info to ensure the user is authenticated
  const userRes = await fetch(`${backendUrl}/me`, { credentials: "include" });
  if (!userRes.ok) return {}
  const userInfo: UserInfo = await userRes.json();
  
  // Fetch the list of files
  const fileRes = await fetch(`${backendUrl}/list-files`, { credentials: "include" });
  if (!fileRes.ok) return {}
  const filesData: { files: string[] } = await fileRes.json();

  // Construct the files structure
  const files: UserData['files'] = []
  for (let i = 0; i < filesData.files.length; i++) {
    // split by the slashes and then put them into an object
    const parts = filesData.files[i].split('/');
    let current = files;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === '') continue; // skip empty parts (e.g. leading slash)

      // if the part already exists, we just continue
      const existing = current.find(f => f.name === part);
      if (existing) {
        current = 'files' in existing ? existing.files : [];
        continue;
      }

      // if it's the last part, we create a file
      if (i === parts.length - 1) {
        current.push({
          name: part,
          location: `/${parts.slice(0, i + 1).join('/')}`
        });
        continue;
      }

      // otherwise we create a folder
      const existingFolder = current.find(f => 'files' in f && f.name === part);
      if (existingFolder && 'files' in existingFolder) {
        current = existingFolder.files;
        continue;
      }
      // create a new folder
      const folder: Folder = {
        name: part,
        location: `/${parts.slice(0, i + 1).join('/')}`,
        files: [],
      };
      current.push(folder);
      current = folder.files;
    }
  }

  return { userInfo, files };
}

export const UserDataContext = createContext<UserData>({
  userInfo: undefined,
  files: [
    {
      name: 'index.py',
      location: '/index.py'
    }
  ],
});