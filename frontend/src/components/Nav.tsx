import LogoCsRoom from './LogoCsRoom';
import { LogOut, LogIn, BookOpen, School, Terminal, ShieldCheck } from 'lucide-react';
import { useContext, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { apiUrl, UserDataContext } from '../util/UserData';
import { NavLink, PrimaryButton } from './ui/Buttons';
import { cn } from '../util/cn';

// Name + initials helpers — temporarily unused while the bubble is hidden.
// function getInitials(name: string | null | undefined, email: string): string {
//   const trimmed = (name ?? '').trim();
//   if (trimmed) {
//     const parts = trimmed.split(/\s+/).filter(Boolean);
//     if (parts.length >= 2) {
//       return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
//     }
//     return parts[0].slice(0, 2).toUpperCase();
//   }
//   const local = email.split('@')[0] ?? email;
//   const parts = local.split(/[._-]+/).filter(Boolean);
//   if (parts.length >= 2) {
//     return (parts[0][0] + parts[1][0]).toUpperCase();
//   }
//   return local.slice(0, 2).toUpperCase();
// }
//
// function getDisplayName(name: string | null | undefined, email: string): string {
//   const trimmed = (name ?? '').trim();
//   if (trimmed) return trimmed;
//   return email.split('@')[0] ?? email;
// }

// Anchor/Link variant of the NavLink button — same visual styling, but
// rendered as an <a> or react-router <Link> so client-side navigation works
// without nesting interactive elements.
function NavLinkA({
  to, href, active = false, icon, children,
}: {
  to?: string;
  href?: string;
  active?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const stateClasses = active
    ? 'bg-paper-tinted text-ink-strong'
    : 'bg-transparent text-ink-default';
  const className = cn(
    stateClasses,
    'px-3.5 py-2 rounded-md text-sm font-medium inline-flex items-center gap-[7px] cursor-pointer whitespace-nowrap transition-colors duration-150 hover:bg-paper-tinted no-underline',
  );
  const content = (
    <>
      {icon && <span className="inline-flex">{icon}</span>}
      {children}
    </>
  );
  if (to) {
    return <Link to={to} className={className}>{content}</Link>;
  }
  return <a href={href} className={className}>{content}</a>;
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
  // const email = userData?.userInfo?.email ?? '';
  // const name = userData?.userInfo?.name ?? '';

  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="sticky top-0 z-50 bg-paper border-b border-rule-soft flex items-center gap-1 px-7 py-[18px]">
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
          {/* Name + initials bubble — temporarily hidden, revisit later.
          <span className="inline-flex items-center gap-2.5 px-2.5 py-1">
            <span className="w-[30px] h-[30px] bg-tomato text-white text-xs font-bold inline-flex items-center justify-center rounded-full">
              {getInitials(name, email)}
            </span>
            <span className="text-[13.5px] text-ink-default whitespace-nowrap">{getDisplayName(name, email)}</span>
          </span>
          */}
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
    </nav>
  );
}
