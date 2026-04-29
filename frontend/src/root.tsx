import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from 'react-router';
import NavComponent from './components/Nav';
import { UserData, UserDataContext, apiUrl, clientLoader, StudentViewContext } from './util/UserData';
import {
  fetchFilesList,
  setLastOpenLocation,
  Files,
  FileType,
} from './util/Files';

// eslint-disable-next-line react-refresh/only-export-components
export { clientLoader };
// Run clientLoader on initial hydration too, not just SPA navigations.
// Without this, prerendered routes (and the __spa-fallback.html that
// non-prerendered routes serve from) would show whatever empty value
// `loader` baked in until the user navigates — meaning a freshly
// signed-in user lands on /ide, sees `userInfo === undefined`, and
// main.tsx immediately Navigates them back to "/".
(clientLoader as typeof clientLoader & { hydrate: boolean }).hydrate = true;

// Build-time loader: returns empty defaults so the prerender step has root
// loaderData to render with. Without this, clientLoader-only routes can't
// render server-side and the whole tree falls into a Suspense boundary
// that never resolves at build time, leaving prerendered HTML empty.
// Real user/file data is still fetched at runtime by `clientLoader` after
// hydration.
// eslint-disable-next-line react-refresh/only-export-components
export async function loader() {
  return {};
}

// Default meta. Routes can override individual entries (title, description,
// og:title, etc.) by exporting their own `meta` function — React Router
// dedupes by name/property, with the route-level entries winning.
// eslint-disable-next-line react-refresh/only-export-components
export const meta = ({ location }: { location: { pathname: string } }) => {
  // Normalize trailing slash so canonical/og:url match what the sitemap lists
  // (no trailing slash except for the root). Without this, nested routes
  // emit `/lessons/` while the sitemap says `/lessons`, which Google treats
  // as two different URLs.
  const path = location.pathname === '/' ? '/' : location.pathname.replace(/\/$/, '');
  const url = `https://www.csroom.org${path}`;
  return [
    { title: 'CS Room | Free Online Coding Classrooms' },
    { name: 'description', content: 'Free, browser-based coding environments and classrooms for teachers and students.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'CS Room' },
    { property: 'og:title', content: 'CS Room | Free Online Coding Classrooms' },
    { property: 'og:description', content: 'Free, browser-based coding environments and classrooms for teachers and students.' },
    { property: 'og:url', content: url },
    { property: 'og:image', content: 'https://www.csroom.org/og-card.png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: 'CS Room — the coding classroom that stays with students' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'CS Room | Free Online Coding Classrooms' },
    { name: 'twitter:description', content: 'Free, browser-based coding environments and classrooms for teachers and students.' },
    { name: 'twitter:image', content: 'https://www.csroom.org/og-card.png' },
    { tagName: 'link', rel: 'canonical', href: url },
  ];
};

// HydrateFallback is rendered while the client loader is running
export function HydrateFallback() {
  return null;
}

const OPEN_FOLDERS_STORAGE_KEY = 'csroom:open-folders';

function loadPersistedOpenFolders(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OPEN_FOLDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function collectFolderLocations(items: Files, out: Set<string>): void {
  for (const item of items) {
    if ('files' in item) {
      out.add(item.location);
      collectFolderLocations(item.files, out);
    }
  }
}

export function Layout({ children }: { children: ReactNode }) {
  const loaderData = useLoaderData<UserData>();
  const [openFolders, setOpenFolders] = useState<string[]>(() => loadPersistedOpenFolders());
  // currentFile starts undefined. The actual restore-on-reload happens in
  // Editor.tsx's initial-file effect — by the time it runs, the file tree
  // is guaranteed to be loaded, which avoids a timing race against
  // loaderData population that broke this when handled here.
  const [currentFile, setCurrentFile] = useState<FileType | undefined>(undefined);
  const [openFiles, setOpenFiles] = useState<FileType[]>([]);
  const [files, setFilesClientSide] = useState<Files | undefined>(loaderData?.files);
  const [classroomSymlinks, setClassroomSymlinks] = useState(loaderData?.classroomSymlinks || {});
  const [isUserEditingName, setIsUserEditingName] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>();
  const [dragOverLocation, setDragOverLocation] = useState<string | undefined>();
  const [contentVersion, setContentVersion] = useState<number>(0);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; targetLocation?: string }>({ visible: false, x: 0, y: 0 });
  const [studentView, setStudentView] = useState<StudentViewContext | undefined>();
  const [clipboardLocation, setClipboardLocation] = useState<string | undefined>();

  // Keep a live ref of editing state to guard against in-flight refreshes overwriting editor input
  useEffect(() => {
    // isUserEditingNameRef.current = isUserEditingName; // This line is removed
  }, [isUserEditingName]);

  // Persist the set of expanded folders so the explorer restores its open
  // state after a reload / tab switch. Only the user's own toggles flow
  // into state (no server sync), so writing on every change is cheap.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(OPEN_FOLDERS_STORAGE_KEY, JSON.stringify(openFolders));
    } catch {
      // quota or unavailable — ignore
    }
  }, [openFolders]);

  // Any time the active file changes, ensure it's present in the open-tabs
  // list. Callsites just call setCurrentFile — opening a tab is a side effect.
  useEffect(() => {
    if (!currentFile) return;
    setOpenFiles((prev) =>
      prev.some((f) => f.location === currentFile.location) ? prev : [...prev, currentFile],
    );
  }, [currentFile]);

  // Persist the last-open file location so reloads / new tabs reopen it.
  // Reading happens once at mount (see useState initializer above); writes
  // do NOT subscribe other tabs via storage events, so a file change in
  // tab A leaves tab B's editor untouched until B is reloaded.
  useEffect(() => {
    setLastOpenLocation(currentFile?.location);
  }, [currentFile?.location]);

  // Prune persisted open-folder entries that no longer exist in the current
  // file tree (renamed, deleted, archived classroom, etc.). Runs every time
  // the tree changes; a no-op if every entry still resolves to a folder.
  useEffect(() => {
    if (!files) return;
    const existing = new Set<string>();
    collectFolderLocations(files, existing);
    setOpenFolders((prev) => {
      const kept = prev.filter((loc) => existing.has(loc));
      return kept.length === prev.length ? prev : kept;
    });
  }, [files]);

  const refreshFiles = useCallback(async (force?: boolean) => {
    // Skip starting a refresh while the user is typing a name — unless the
    // caller passes force=true (e.g. after successfully creating a file via
    // the inline rename input, where we explicitly want the tree re-fetched
    // so the placeholder/renaming flags get cleared).
    if (!force && isUserEditingName) return;
    try {
      const { files: newFiles, classroomSymlinks: newMap } = await fetchFilesList();
      if (!force && isUserEditingName) return;
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
    document.addEventListener('csroom:rename', handler as EventListener);
    return () => document.removeEventListener('csroom:rename', handler as EventListener);
  }, [files]);

  // Teacher-side: keep the "Viewing X's file" header in sync with which file
  // the teacher has open. Entering a student's project sets the banner,
  // switching to another student's project updates it, and clicking any
  // file outside a student's project (including in the teacher's own
  // workspace) clears it along with the test-output panel in Editor.tsx.
  useEffect(() => {
    const loc = currentFile?.location;
    if (!loc || !classroomSymlinks) {
      if (studentView) setStudentView(undefined);
      return;
    }
    const parts = loc.split('/').filter(Boolean);
    // A teacher's in-classroom file path looks like
    //   /{slug}/participants/{sanitized-email}/{template}/...
    if (parts.length < 5 || parts[1] !== 'participants') {
      if (studentView) setStudentView(undefined);
      return;
    }
    const slug = parts[0];
    const info = classroomSymlinks[slug];
    if (!info || !info.isInstructor) {
      if (studentView) setStudentView(undefined);
      return;
    }
    const next: StudentViewContext = {
      classroomId: info.id,
      studentEmail: parts[2],
      templateName: parts[3],
    };
    if (
      studentView?.classroomId === next.classroomId &&
      studentView?.studentEmail === next.studentEmail &&
      studentView?.templateName === next.templateName
    ) return;
    setStudentView(next);
  }, [currentFile?.location, classroomSymlinks, studentView]);

  const userData = {
    ...loaderData,
    files,
    setFilesClientSide,
    openFolders,
    setOpenFolders,
    currentFile,
    setCurrentFile,
    openFiles,
    setOpenFiles,
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
    studentView,
    setStudentView,
    clipboardLocation,
    setClipboardLocation,
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
    document.addEventListener('csroom:rename', handler as EventListener);
    return () => document.removeEventListener('csroom:rename', handler as EventListener);
  }, []);

  // Update files state when loaderData changes
  useEffect(() => {
    if (loaderData?.files && !files) {
      setFilesClientSide(loaderData.files);
    }
  }, [loaderData?.files, files]);

  // Listen for real-time file change notifications from the backend via Socket.IO
  useEffect(() => {
    if (!loaderData?.userInfo) return;

    const handler = () => {
      if (!isUserEditingName) refreshFiles();
    };
    window.addEventListener('csroom:files-changed', handler);
    return () => window.removeEventListener('csroom:files-changed', handler);
  }, [loaderData?.userInfo, refreshFiles, isUserEditingName]);

  // Fallback poll to catch CLI changes inside the container (e.g. touch, rm)
  useEffect(() => {
    if (!loaderData?.userInfo) return;

    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      if (isUserEditingName) return;
      refreshFiles();
    }, 30_000);

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
        fetch(`${apiUrl}/classrooms/${classroom.id}`, {
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
        fetch(`${apiUrl}/classrooms/${classroom.id}/archive`, {
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
        fetch(`${apiUrl}/classrooms/${classroom.id}/archive`, {
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

    window.addEventListener('csroom:classroom-action', handler as EventListener);
    return () => window.removeEventListener('csroom:classroom-action', handler as EventListener);
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
        const res = await fetch(`${apiUrl}/classrooms/restore-by-slug`, {
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

    window.addEventListener('csroom:archive-restore', handler as EventListener);
    return () => window.removeEventListener('csroom:archive-restore', handler as EventListener);
  }, [refreshFiles]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-3YB0XHNYT5"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-3YB0XHNYT5');
gtag('config', 'AW-11483620641');`,
          }}
        />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#fdfaf2" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <Meta />
        <Links />
      </head>
      <body className="bg-paper text-ink-default">
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