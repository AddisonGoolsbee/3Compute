import TerminalTabs from './components/Terminal';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import Layout from './Layout';
import { useContext, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { UserDataContext } from './util/UserData';
import type { Files, FileType } from './util/Files';

// Recursively search for a file in the tree (pure function, stable reference)
function findFile(items: Files, location: string): FileType | undefined {
  for (const item of items) {
    if (item.location === location) return item;
    if ('files' in item) {
      const found = findFile(item.files, location);
      if (found) return found;
    }
  }
  return undefined;
}

export default function App() {
  const userData = useContext(UserDataContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkProcessedRef = useRef(false);
  const deepLinkRefreshedRef = useRef(false);

  // If the user arrived via a deep link (e.g. "Edit in IDE" on a freshly-uploaded
  // draft), the cached file tree may pre-date the new folder. Refresh once so the
  // target is findable by the processing effects below.
  useEffect(() => {
    if (deepLinkRefreshedRef.current) return;
    if (!searchParams.get('classroom')) return;
    deepLinkRefreshedRef.current = true;
    userData.refreshFiles();
  }, [searchParams, userData]);

  // Helper: open all parent folders so a path is visible in the explorer
  const openParentFolders = (targetLocation: string) => {
    const parts = targetLocation.split('/').filter(Boolean);
    const foldersToOpen: string[] = [];
    for (let i = 1; i < parts.length; i++) {
      foldersToOpen.push('/' + parts.slice(0, i).join('/'));
    }
    userData.setOpenFolders((prev: string[]) => {
      const next = [...prev];
      for (const f of foldersToOpen) {
        if (!next.includes(f)) next.push(f);
      }
      return next;
    });
  };

  // Deep-link: open a specific student file when navigating from classroom detail
  useEffect(() => {
    if (deepLinkProcessedRef.current) return;
    const classroomId = searchParams.get('classroom');
    const studentEmail = searchParams.get('student');
    const filePath = searchParams.get('file');

    if (!classroomId || !studentEmail || !filePath) return;
    if (!userData.files || !userData.classroomSymlinks) return;

    const slug = Object.entries(userData.classroomSymlinks).find(
      ([, info]) => info.id === classroomId,
    )?.[0];
    if (!slug) return;

    const sanitizedEmail = (studentEmail || '').replace(/\//g, '_');
    const targetLocation = `/${slug}/participants/${sanitizedEmail}/${filePath}`;

    const file = findFile(userData.files, targetLocation);
    if (file) {
      deepLinkProcessedRef.current = true;
      userData.setCurrentFile(file);
      userData.setSelectedLocation?.(file.location);

      const templateName = filePath.split('/')[0];
      userData.setStudentView?.({
        classroomId,
        studentEmail,
        templateName,
      });

      openParentFolders(targetLocation);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, userData]);

  // Deep-link: open a folder (e.g. draft) in the IDE, or just a classroom
  // root, selecting README.md if present and cd'ing the terminal.
  useEffect(() => {
    if (deepLinkProcessedRef.current) return;
    const classroomId = searchParams.get('classroom');
    const folderPath = searchParams.get('folder');
    const studentEmail = searchParams.get('student');
    const filePath = searchParams.get('file');

    if (!classroomId) return;
    // If this is the student-file variant it's handled by the effect above.
    if (studentEmail || filePath) return;
    if (!userData.files || !userData.classroomSymlinks) return;

    const slug = Object.entries(userData.classroomSymlinks).find(
      ([, info]) => info.id === classroomId,
    )?.[0];
    if (!slug) return;

    deepLinkProcessedRef.current = true;

    const folderLocation = folderPath ? `/${slug}/${folderPath}` : `/${slug}`;

    // Try to find a README.md inside the folder
    const readmePath = `${folderLocation}/README.md`;
    const readmeFile = findFile(userData.files, readmePath);

    if (readmeFile) {
      userData.setCurrentFile(readmeFile);
      userData.setSelectedLocation?.(readmeFile.location);
      openParentFolders(readmeFile.location);
    } else {
      // Just open the folder in the explorer
      openParentFolders(folderLocation + '/placeholder');
    }

    // cd the terminal only when we're deep-linking into a specific folder
    // (e.g. "Edit in IDE" on a draft). Plain "Open in IDE" on a classroom
    // leaves the terminal where it is. Delay long enough for the pty to
    // connect and the shell prompt to draw; the run-command handler only
    // fires on the active tab, so an early dispatch would be dropped.
    if (folderPath) {
      const containerPath = `/app${folderLocation}`.replace(/'/g, '\'\\\'\'');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('3compute:run-command', {
          detail: { command: `cd '${containerPath}'\n` },
        }));
      }, 1500);
    }

    setSearchParams({}, { replace: true });
  }, [searchParams, userData]);

  if (!userData.userInfo) {
    return <Login />;
  }

  if (userData.userInfo.needs_onboarding) {
    return <Onboarding />;
  }

  return (
    <Layout>
      <TerminalTabs />
    </Layout>
  );
}
