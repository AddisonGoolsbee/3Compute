import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from 'react-router';
import NavComponent from './components/Nav';
import { default as HomeLayout } from './Layout';
import { UserData, UserDataContext, clientLoader } from './util/UserData';
import { fetchFilesList, Files, FileType } from './util/Files';

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
  const [files, setFilesClientSide] = useState<Files | undefined>(loaderData?.files);
  const [isUserEditingName, setIsUserEditingName] = useState(false);
  const isUserEditingNameRef = useRef(isUserEditingName);

  // Keep a live ref of editing state to guard against in-flight refreshes overwriting editor input
  useEffect(() => {
    isUserEditingNameRef.current = isUserEditingName;
  }, [isUserEditingName]);

  const refreshFiles = useCallback(async () => {
    // Skip starting a refresh while the user is typing a name
    if (isUserEditingNameRef.current) return;
    try {
      const oldCurrent = currentFile;
      const newFiles = await fetchFilesList();
      // If user started editing while the request was in-flight, ignore this result
      if (isUserEditingNameRef.current) return;
      setFilesClientSide(newFiles);
      // Preserve currently open file selection by object identity replacement
      if (oldCurrent) {
        const match = (function findMatch(items: Files): typeof oldCurrent | undefined {
          for (const item of items) {
            if ('files' in item) {
              const found = findMatch(item.files);
              if (found) return found as any;
            } else if (item.location === oldCurrent.location) {
              return item as any;
            }
          }
          return undefined;
        })(newFiles);
        if (match) setCurrentFile(match);
      }
    } catch (error) {
      console.error('Failed to refresh files:', error);
    }
  }, [currentFile]);

  const userData = {
    ...loaderData,
    files,
    setFilesClientSide,
    openFolders,
    setOpenFolders,
    currentFile,
    setCurrentFile,
    refreshFiles,
    isUserEditingName,
    setIsUserEditingName,
  };

  // Update files state when loaderData changes
  useEffect(() => {
    if (loaderData?.files && !files) {
      setFilesClientSide(loaderData.files);
    }
  }, [loaderData?.files, files]);

  // Periodically refresh files to reflect changes made via CLI inside the container
  useEffect(() => {
    if (!loaderData?.userInfo) return;

    const intervalId = window.setInterval(() => {
      // Skip refresh when the tab is hidden to reduce load
      if (document.hidden) return;
      // Pause refresh while the user is actively typing a name to avoid losing placeholders
      if (isUserEditingName) return;
      refreshFiles();
    }, 400);

    return () => window.clearInterval(intervalId);
  }, [loaderData?.userInfo, refreshFiles, isUserEditingName]);

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