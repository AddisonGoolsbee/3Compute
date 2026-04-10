import { Nav, LogoBirdflop } from '@luminescent/ui-react';
import { LogOut, BookOpen, School, Terminal } from 'lucide-react';
import { useContext } from 'react';
import { Link } from 'react-router';
import { apiUrl, UserDataContext } from '../util/UserData';

export default function NavComponent() {
  const handleLogout = async () => {
    await fetch(`${apiUrl}/auth/logout`, {
      credentials: 'include',
    });
    window.location.href = '/';
  };

  const userData = useContext(UserDataContext);
  const isTeacher = userData?.userInfo?.role === 'teacher';
  const isLoggedIn = !!userData?.userInfo;

  return (
    <Nav
      start={
        <Link
          to="/"
          className="lum-btn lum-bg-transparent hover:lum-bg-nav-bg"
        >
          <LogoBirdflop size={24} fillGradient={['#54daf4', '#545eb6']} />
          <span className="font-semibold -ml-1">3Compute</span>
        </Link>
      }
      end={
        <>
          {isLoggedIn && (
            <Link
              to="/ide"
              className="lum-btn lum-bg-transparent hover:lum-bg-nav-bg flex items-center gap-1 text-sm font-medium transition-colors px-3 py-2"
            >
              <Terminal size={16} className="opacity-80" />
              <span>IDE</span>
            </Link>
          )}
          {isTeacher && (
            <Link
              to="/lessons"
              className="lum-btn lum-bg-transparent hover:lum-bg-nav-bg flex items-center gap-1 text-sm font-medium transition-colors px-3 py-2"
            >
              <BookOpen size={16} className="opacity-80" />
              <span>Lessons</span>
            </Link>
          )}
          {isLoggedIn && (
            <Link
              to="/classrooms"
              className="lum-btn lum-bg-transparent hover:lum-bg-nav-bg flex items-center gap-1 text-sm font-medium transition-colors px-3 py-2"
            >
              <School size={16} className="opacity-80" />
              <span>Classrooms</span>
            </Link>
          )}
          {userData?.userInfo && (
            <button
              onClick={handleLogout}
              className="lum-btn lum-bg-transparent hover:lum-bg-red-700 flex items-center gap-1 cursor-pointer select-none text-sm font-medium transition-colors px-3 py-2 text-red-300"
            >
              <LogOut size={20} />
              Log out
            </button>
          )}
        </>
      }
    />
  );
}
