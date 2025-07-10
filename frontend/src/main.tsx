import Terminal from "./components/Terminal";
import Login from "./components/Login";
import { clientLoader as clientLoaderFromRoot, UserInfo } from "./root";
import { useLoaderData } from "react-router";
import { FolderIcon } from "lucide-react";
import MenuItems from "./components/MenuItems";
import UploadButton from "./components/UploadButton";
import TemplateButton from "./components/TemplateButton";
import Editor from "./components/Editor";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export declare interface File {
    readonly name: string;
}
export declare interface Folder extends File {
    readonly files: (Folder | File)[];
}


// eslint-disable-next-line react-refresh/only-export-components
export async function clientLoader() {
  // Fetch user info to ensure the user is authenticated
  const userInfo = await clientLoaderFromRoot();
  if (!userInfo) return {};

  // Fetch the list of files
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

  return { userInfo, files };
}

export default function App() {
  const { userInfo, files } = useLoaderData() as {
    userInfo?: UserInfo
    files?: (Folder | File)[];
  };

  if (!userInfo) {
    return <Login />;
  }

  return (
    <div className="max-h-[calc(100svh-6rem)] flex flex-col gap-1 items-center justify-center max-w-6xl mx-auto">
      <div className="flex h-10 flex-1 w-full gap-1">
        <div className="flex flex-col w-1/4 lum-card gap-1 p-1 lum-bg-gray-950 border-lum-border/30">
          <div className="flex flex-col items-center gap-3 py-2 bg-gray-900 rounded-lum-1 border-b border-b-lum-border/10"  >
            <div className="flex w-full items-center px-4 gap-3 text-lg font-semibold">
              <FolderIcon size={26} />
              Files
            </div>
            <div className="flex gap-1">
              <UploadButton />
              <TemplateButton userInfo={userInfo} />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {Array.isArray(files) ? (
              <MenuItems files={files} />
            ) : (
              <div className="text-red-500">Error loading files</div>
            )}
          </div>
        </div>
        <Editor />
      </div>
      <div className="w-full">
        <Terminal />
      </div>
      <div className="text-sm text-lum-text-secondary mt-2">
        Your available port range: {userInfo.port_start}-{userInfo.port_end}
      </div>
    </div>
  );
}
