import { redirect, useLoaderData } from "react-router";
import { File, Folder } from "lucide-react";
import MenuItems from "./components/MenuItems";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export declare interface File {
    readonly name: string;
}
export declare interface Folder extends File {
    readonly files: (Folder | File)[];
}

// eslint-disable-next-line react-refresh/only-export-components
export async function clientLoader() {
  const userres = await fetch(`${backendUrl}/me`, { credentials: "include" });
  if (!userres.ok) return redirect("/");

  const endpoint = `${backendUrl}/list-files`;

  const res = await fetch(endpoint, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    return 'Error fetching files: ' + res.statusText;
  }

  const data = await res.json();

  const files = [] as (Folder | File)[];

  console.log(data.files);
  // handle files
  for (let i = 0; i < data.files.length; i++) {
    // split by the slashes and then put them into an object
    const parts = data.files[i].split('/');
    let current = files;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      console.log('Processing part:', part);
      const existing = current.find(f => f.name === part);
      if (existing) {
        // if the part already exists, we just continue
        current = 'files' in existing ? existing.files : [];
        continue;
      }
      // otherwise we create a new folder
      if (part === '') continue; // skip empty parts (e.g. leading slash)
      if (i === parts.length - 1) {
        // if it's the last part, we create a file
        current.push({ name: part } as File);
        continue;
      }
      // otherwise we create a folder
      const existingFolder = current.find(f => 'files' in f && f.name === part);
      if (existingFolder && 'files' in existingFolder) {
        current = existingFolder.files;
        continue;
      }
      // create a new folder
      const folder: Folder = { name: part, files: [] };
      current.push(folder);
      current = folder.files;
    }
  }

  return files;
}


export default function App() {
  const files = useLoaderData() as (Folder | File)[] | string;
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex h-[80dvh] max-w-6xl w-full gap-1 p-2">
          <div className="flex flex-col w-1/3 lum-card gap-1 p-1 lum-bg-gray-950">
            <div className="flex items-center gap-3 px-4 py-2 mb-3 bg-gray-900 rounded-lum-1 border-b border-b-lum-border/10 text-lg font-semibold">
              <Folder size={26} />
              Files
            </div>
            {Array.isArray(files) ? (
              <MenuItems files={files} />
            ) : (
              <div className="text-red-500">Error loading files</div>
            )}
          </div>
          <div className="lum-card flex-1 p-4">
            Editor here
          </div>
        </div>
      </div>
    </>
  );
}
