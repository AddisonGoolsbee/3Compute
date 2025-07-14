import { ReactNode, useCallback, useEffect, useState } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";
import NavComponent from "./components/Nav";
import { default as HomeLayout } from "./Layout";
import { UserData, UserDataContext, clientLoader } from "./util/UserData";
import { fetchFilesList, Files, FileType } from "./util/Files";

// eslint-disable-next-line react-refresh/only-export-components
export { clientLoader };

// HydrateFallback is rendered while the client loader is running
export function HydrateFallback() {
  return <HomeLayout />;
}

export function Layout({ children }: { children: ReactNode }) {
  const loaderData = useLoaderData<UserData>();
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<FileType | undefined>();
  const [files, setFiles] = useState<Files | undefined>(loaderData?.files);

  const refreshFiles = useCallback(async () => {
    try {
      const newFiles = await fetchFilesList();
      setFiles(newFiles);
    } catch (error) {
      console.error("Failed to refresh files:", error);
    }
  }, []);

  const userData = {
    ...loaderData,
    files,
    openFolders,
    setOpenFolders,
    currentFile,
    setCurrentFile,
    refreshFiles,
  }

  // Update files state when loaderData changes
  useEffect(() => {
    if (loaderData?.files && !files) {
      setFiles(loaderData.files);
    }
  }, [loaderData?.files, files]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <Meta />
        <Links />
        <title>3Compute</title>
      </head>
      <body className="bg-bg text-lum-text mt-20">
        <UserDataContext value={userData}>
          <NavComponent />
          {children}
        </UserDataContext>
        <Scripts />
        <ScrollRestoration />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <Outlet />
  );
}