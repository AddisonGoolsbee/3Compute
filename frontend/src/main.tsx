import TerminalTabs from './components/Terminal';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import Layout from './Layout';
import { useContext, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { UserDataContext } from './util/UserData';
import type { Files, FileType } from './util/Files';

export default function App() {
  const userData = useContext(UserDataContext);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link: open a specific file when navigating from classroom detail
  useEffect(() => {
    const classroomId = searchParams.get('classroom');
    const studentEmail = searchParams.get('student');
    const filePath = searchParams.get('file');

    if (!classroomId || !studentEmail || !filePath) return;
    if (!userData.files || !userData.classroomSymlinks) return;

    // Find the classroom slug by matching its ID
    const slug = Object.entries(userData.classroomSymlinks).find(
      ([, info]) => info.id === classroomId,
    )?.[0];
    if (!slug) return;

    const sanitizedEmail = (studentEmail || '').replace(/\//g, '_');
    const targetLocation = `/${slug}/participants/${sanitizedEmail}/${filePath}`;

    // Recursively search for the file in the tree
    const findFile = (items: Files): FileType | undefined => {
      for (const item of items) {
        if (item.location === targetLocation) return item;
        if ('files' in item) {
          const found = findFile(item.files);
          if (found) return found;
        }
      }
      return undefined;
    };

    const file = findFile(userData.files);
    if (file) {
      userData.setCurrentFile(file);
      userData.setSelectedLocation?.(file.location);

      // Open all parent folders so the file is visible in the explorer
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

      // Clear search params so it doesn't re-trigger
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, userData.files, userData.classroomSymlinks]);

  if (!userData.userInfo) {
    return (
      <>
        <Layout>
          <TerminalTabs />
        </Layout>
        <Login />
      </>
    );
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
