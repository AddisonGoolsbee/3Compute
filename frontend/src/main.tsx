import Terminal from "./components/Terminal";
import Login from "./components/Login";
import { clientLoader as clientLoaderFromRoot, UserInfo } from "./root";
import { useLoaderData } from "react-router";
import Layout from "./Layout";

const backendUrl = import.meta.env.VITE_ENVIRONMENT === "production"
  ? import.meta.env.VITE_PROD_BACKEND_URL
  : import.meta.env.VITE_BACKEND_URL;


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

  return <>
    <Layout userInfo={userInfo} files={files}>
      <Terminal />
    </Layout>
    {!userInfo && <Login />}
  </>;
}
