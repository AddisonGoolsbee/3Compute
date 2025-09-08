import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from 'react-router';
import NavComponent from './components/Nav';
import IndexLayout from './routes/index.layout';
import { UserData, UserDataContext, clientLoader } from './util/UserData';
import { fetchFilesList, Files, FileType } from './util/Files';

// eslint-disable-next-line react-refresh/only-export-components
export { clientLoader };

// HydrateFallback is rendered while the client loader is running
export function HydrateFallback() {
  return <IndexLayout />;
}

export function Layout({ children }: { children: ReactNode }) {
  const loaderData = useLoaderData<UserData>();
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<FileType | undefined>();
  const [files, setFilesClientSide] = useState<Files | undefined>(loaderData?.files);
  const [isUserEditingName, setIsUserEditingName] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();
  const [dragOverLocation, setDragOverLocation] = useState<string | undefined>();
  const [contentVersion, setContentVersion] = useState<number>(0);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; targetLocation?: string }>({ visible: false, x: 0, y: 0 });
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

  // Global handler to enter renaming mode by location (used by right-click)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { location: string } | undefined;
      if (!detail || !files) return;
      setIsUserEditingName(true);
      const mutate = (items: Files): Files => items.map((it) => {
        if (it.location === detail.location) return { ...it, renaming: true } as any;
        if ('files' in it) return { ...it, files: mutate(it.files) } as any;
        return it;
      });
      setFilesClientSide(mutate(files));
    };
    document.addEventListener('3compute:rename', handler as EventListener);
    return () => document.removeEventListener('3compute:rename', handler as EventListener);
  }, [files]);

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
    selectedLocation,
    setSelectedLocation,
    dragOverLocation,
    setDragOverLocation,
    contentVersion,
    setContentVersion,
    contextMenu,
    setContextMenu,
  };

  // Ensure only one item is in renaming mode at a time; invoked via right-click context action
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { location: string } | undefined;
      if (!detail) return;
      setIsUserEditingName(true);
      setFilesClientSide((prev) => {
        if (!prev) return prev;
        const clearAndFlag = (items: Files): Files => items.map((it) => {
          const base: any = { ...it, renaming: false };
          if ('files' in it) return { ...base, files: clearAndFlag(it.files) } as any;
          return base;
        });
        // Clear all renaming flags first
        let next = clearAndFlag(prev);
        // Now set renaming on the target
        const setFlag = (items: Files): Files => items.map((it) => {
          if (it.location === detail.location) return { ...(it as any), renaming: true };
          if ('files' in it) return { ...it, files: setFlag(it.files) } as any;
          return it;
        });
        next = setFlag(next);
        return next;
      });
    };
    document.addEventListener('3compute:rename', handler as EventListener);
    return () => document.removeEventListener('3compute:rename', handler as EventListener);
  }, []);

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
    }, 300);

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