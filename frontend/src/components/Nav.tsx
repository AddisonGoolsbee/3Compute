import LogoCsRoom from './LogoCsRoom';
import { LogOut, LogIn, BookOpen, School, Terminal, ShieldCheck, Menu, X } from 'lucide-react';
import { useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { apiUrl, UserDataContext } from '../util/UserData';
import { NavLink, PrimaryButton } from './ui/Buttons';
import { cn } from '../util/cn';

// Anchor/Link variant of the NavLink button — same visual styling, but
// rendered as an <a> or react-router <Link> so client-side navigation works
// without nesting interactive elements.
function NavLinkA({
  to, href, active = false, icon, children, onClick, full = false,
}: {
  to?: string;
  href?: string;
  active?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  full?: boolean;
}) {
  const stateClasses = active
    ? 'bg-paper-tinted text-ink-strong'
    : 'bg-transparent text-ink-default';
  const className = cn(
    stateClasses,
    'px-3.5 py-2 rounded-md text-sm font-medium inline-flex items-center gap-[7px] cursor-pointer whitespace-nowrap transition-colors duration-150 hover:bg-paper-tinted no-underline',
    full && 'w-full justify-start',
  );
  const content = (
    <>
      {icon && <span className="inline-flex">{icon}</span>}
      {children}
    </>
  );
  if (to) {
    return <Link to={to} className={className} onClick={onClick}>{content}</Link>;
  }
  return <a href={href} className={className} onClick={onClick}>{content}</a>;
}

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
  const isAdmin = !!userData?.userInfo?.is_admin;

  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const [menuOpen, setMenuOpen] = useState(false);
  // Close the mobile menu whenever the route changes.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  const closeMenu = () => setMenuOpen(false);

  const loggedInLinks = (
    <>
      <NavLinkA to="/ide" active={isActive('/ide')} icon={<Terminal size={15} />} onClick={closeMenu} full>Workspace</NavLinkA>
      <NavLinkA to="/classrooms" active={isActive('/classrooms')} icon={<School size={15} />} onClick={closeMenu} full>Classrooms</NavLinkA>
      {isTeacher && (
        <NavLinkA to="/lessons" active={isActive('/lessons')} icon={<BookOpen size={15} />} onClick={closeMenu} full>Lessons</NavLinkA>
      )}
      {isAdmin && (
        <NavLinkA to="/admin" active={isActive('/admin')} icon={<ShieldCheck size={15} />} onClick={closeMenu} full>Admin</NavLinkA>
      )}
    </>
  );

  const loggedOutLinks = (
    <NavLinkA href="lessons" icon={<BookOpen size={15} />} onClick={closeMenu} full>Lessons</NavLinkA>
  );

  return (
    <nav className="sticky top-0 z-50 bg-paper border-b border-rule-soft">
      <div className="flex items-center gap-1 px-4 sm:px-7 py-[18px]">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 px-2 py-1 rounded-md hover:bg-paper-tinted transition-colors duration-150 no-underline"
        >
          <LogoCsRoom size={26} />
          <span className="font-serif font-semibold text-[22px] tracking-tight">
            <span className="text-tomato">CS</span>
            <span className="text-ink-strong"> Room</span>
          </span>
        </Link>

        <div className="flex-1" />

        {/* Desktop nav — hidden below md */}
        <div className="hidden md:flex items-center gap-1">
          {isLoggedIn ? (
            <>
              <NavLinkA to="/ide" active={isActive('/ide')} icon={<Terminal size={15} />}>Workspace</NavLinkA>
              <NavLinkA to="/classrooms" active={isActive('/classrooms')} icon={<School size={15} />}>Classrooms</NavLinkA>
              {isTeacher && (
                <NavLinkA to="/lessons" active={isActive('/lessons')} icon={<BookOpen size={15} />}>Lessons</NavLinkA>
              )}
              {isAdmin && (
                <NavLinkA to="/admin" active={isActive('/admin')} icon={<ShieldCheck size={15} />}>Admin</NavLinkA>
              )}
              <div className="w-px h-[22px] bg-rule-soft mx-2.5" />
              <NavLink icon={<LogOut size={14} />} onClick={handleLogout}>Sign out</NavLink>
            </>
          ) : (
            <>
              <NavLinkA href="lessons" icon={<BookOpen size={15} />}>Lessons</NavLinkA>
              <PrimaryButton
                color="navy"
                size="md"
                icon={<LogIn size={15} />}
                onClick={() => { window.location.href = `${apiUrl}/auth/login`; }}
              >
                Sign in
              </PrimaryButton>
            </>
          )}
        </div>

        {/* Mobile toggle — hidden at md and up */}
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-ink-default hover:bg-paper-tinted transition-colors duration-150 cursor-pointer"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="md:hidden border-t border-rule-soft px-4 py-3 flex flex-col gap-1 bg-paper">
          {isLoggedIn ? (
            <>
              {loggedInLinks}
              <div className="h-px bg-rule-soft my-2" />
              <NavLink icon={<LogOut size={14} />} onClick={() => { closeMenu(); handleLogout(); }} className="w-full justify-start">Sign out</NavLink>
            </>
          ) : (
            <>
              {loggedOutLinks}
              <NavLink
                icon={<LogIn size={15} />}
                onClick={() => { closeMenu(); window.location.href = `${apiUrl}/auth/login`; }}
                className="w-full justify-start"
              >
                Sign in
              </NavLink>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
