import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from 'react-router';
import NavComponent from './components/Nav';
import { default as HomeLayout } from './Layout';
import { UserData, UserDataContext, backendUrl, clientLoader } from './util/UserData';
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
  const [classroomSymlinks, setClassroomSymlinks] = useState(loaderData?.classroomSymlinks || {});
  const [isUserEditingName, setIsUserEditingName] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();
  const [dragOverLocation, setDragOverLocation] = useState<string | undefined>();
  const [contentVersion, setContentVersion] = useState<number>(0);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; targetLocation?: string }>({ visible: false, x: 0, y: 0 });

  // Keep a live ref of editing state to guard against in-flight refreshes overwriting editor input
  useEffect(() => {
    // isUserEditingNameRef.current = isUserEditingName; // This line is removed
  }, [isUserEditingName]);

  const refreshFiles = useCallback(async () => {
    // Skip starting a refresh while the user is typing a name
    if (isUserEditingName) return;
    try {
      const { files: newFiles, classroomSymlinks: newMap } = await fetchFilesList();
      // If user started editing while the request was in-flight, ignore this result
      if (isUserEditingName) return;
      setFilesClientSide(newFiles);
      setClassroomSymlinks(newMap);
      // Note: We don't update currentFile here to avoid triggering re-renders in Editor
      // The Editor depends on currentFile.location (string) not the object reference
    } catch (error) {
      console.error('Failed to refresh files:', error);
    }
  }, [isUserEditingName]);

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
    classroomSymlinks,
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

  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { location: string; action: 'rename' | 'archive' | 'restore' } | undefined;
      if (!detail) return;
      const { location, action } = detail;
      const slug = location.split('/').filter(Boolean)[0];
      const classroom = classroomSymlinks?.[slug];
      if (!classroom) return;

      if (action === 'rename') {
        // Only instructors can rename classrooms
        const newName = window.prompt('Rename classroom', classroom.name || slug);
        if (!newName?.trim()) return;
        if (newName.toLowerCase() === 'archive') {
          window.alert('The name \'archive\' is reserved.');
          return;
        }
        fetch(`${backendUrl}/classrooms/${classroom.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: newName.trim() }),
        })
          .then((res) => { if (res.ok) refreshFiles(); })
          .catch((err) => console.error('Rename classroom failed', err));
      } else if (action === 'archive') {
        // const isInstructor = classroom.isInstructor ?? false;
        // const confirmMsg = isInstructor
        //   ? 'Archive this classroom? Students will no longer see it in their list.'
        //   : 'Hide this classroom from your list?';
        // if (!window.confirm(confirmMsg)) {
        //   return;
        // }
        fetch(`${backendUrl}/classrooms/${classroom.id}/archive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ archived: true }),
        })
          .then(async (res) => {
            if (res.ok) {
              // Container restart needed to remove symlink
              window.dispatchEvent(
                new CustomEvent('terminal-restart-required', {
                  detail: { reason: 'classroom-archived' },
                }),
              );
              await refreshFiles();
            }
          })
          .catch((err) => console.error('Archive classroom failed', err));
      } else if (action === 'restore') {
        // Only instructors can restore/unarchive
        const isInstructor = classroom.isInstructor ?? false;
        if (!isInstructor) {
          window.alert('Only the classroom owner can restore an archived classroom.');
          return;
        }
        fetch(`${backendUrl}/classrooms/${classroom.id}/archive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ archived: false }),
        })
          .then(async (res) => {
            if (res.ok) {
              // Container restart needed to add symlink back
              window.dispatchEvent(
                new CustomEvent('terminal-restart-required', {
                  detail: { reason: 'classroom-restored' },
                }),
              );
              await refreshFiles();
            }
          })
          .catch((err) => console.error('Restore classroom failed', err));
      }
    };

    window.addEventListener('3compute:classroom-action', handler as EventListener);
    return () => window.removeEventListener('3compute:classroom-action', handler as EventListener);
  }, [refreshFiles, classroomSymlinks]);

  // Handler for restoring classrooms from the archive folder
  useEffect(() => {
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { slug: string } | undefined;
      if (!detail?.slug) return;

      if (!window.confirm('Restore this classroom from the archive?')) {
        return;
      }

      try {
        const res = await fetch(`${backendUrl}/classrooms/restore-by-slug`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ slug: detail.slug }),
        });

        if (res.ok) {
          window.dispatchEvent(
            new CustomEvent('terminal-restart-required', {
              detail: { reason: 'classroom-restored' },
            }),
          );
          await refreshFiles();
        } else {
          const data = await res.json().catch(() => ({}));
          window.alert(data.error || 'Failed to restore classroom');
        }
      } catch (err) {
        console.error('Restore from archive failed', err);
      }
    };

    window.addEventListener('3compute:archive-restore', handler as EventListener);
    return () => window.removeEventListener('3compute:archive-restore', handler as EventListener);
  }, [refreshFiles]);

  return (
    <html lang="en" suppressHydrationWarning>
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