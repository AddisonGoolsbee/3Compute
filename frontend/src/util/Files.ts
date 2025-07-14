import { createContext } from "react";
import { backendUrl } from "./UserData";


export interface FileType {
  readonly name: string;
  readonly location: string;
  renaming?: boolean; // Used to indicate if the file is being renamed
}

export interface FolderType extends FileType {
  readonly files: Files;
}

export type Files = (FolderType | FileType)[];

export async function fetchFilesList() {
  // Fetch the list of files
  const fileRes = await fetch(`${backendUrl}/list-files`, {
    credentials: "include",
  });
  if (!fileRes.ok) return [];
  const filesData: { files: string[] } = await fileRes.json();

  // Construct the files structure
  const files: Files = [];
  for (let i = 0; i < filesData.files.length; i++) {
    // split by the slashes and then put them into an object
    const parts = filesData.files[i].split("/");
    let current = files;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === "") continue; // skip empty parts (e.g. leading slash)

      // if the part already exists, we just continue
      const existing = current.find((f) => f.name === part);
      if (existing) {
        current = "files" in existing ? existing.files : [];
        continue;
      }

      // if it's the last part, we create a file
      if (i === parts.length - 1) {
        current.push({
          name: part,
          location: `/${parts.slice(0, i + 1).join("/")}`,
        });
        continue;
      }

      // otherwise we create a folder
      const existingFolder = current.find(
        (f) => "files" in f && f.name === part
      );
      if (existingFolder && "files" in existingFolder) {
        current = existingFolder.files;
        continue;
      }
      // create a new folder
      const folder: FolderType = {
        name: part,
        location: `/${parts.slice(0, i + 1).join("/")}`,
        files: [],
      };
      current.push(folder);
      current = folder.files;
    }
  }

  return files;
}

export interface StatusContextType {
  status: string | null;
  setStatus: (status: string | null) => void;
}

export const StatusContext = createContext<StatusContextType>({
  status: null,
  setStatus: () => {},
});