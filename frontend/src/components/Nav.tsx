import { Nav, LogoBirdflop, SelectMenuRaw } from '@luminescent/ui-react';
import { LogOut, User } from 'lucide-react';
import { useContext } from 'react';
import { Link } from 'react-router';
import { backendUrl, UserDataContext } from '../util/UserData';

export default function NavComponent() {
  const handleLogout = async () => {
    await fetch(`${backendUrl}/logout`, {
      credentials: 'include',
    });
    window.location.href = '/';
  };

  const userData = useContext(UserDataContext);

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
          {userData?.userInfo && (
            <SelectMenuRaw className="lum-bg-transparent"
              customDropdown dropdown={
                <div className="flex gap-3 items-center">
                  {userData.userInfo.picture &&
                    <img
                      src={userData.userInfo.picture}
                      alt="User Avatar"
                      className="w-6 h-6 rounded-full"
                    />
                  }
                  {userData.userInfo.name ||
                    userData.userInfo.email ||
                    'User'}
                </div>
              }
              extra-buttons={<>
                <a
                  href="/profile"
                  onClick={handleLogout}
                  className="lum-btn lum-bg-transparent rounded-lum-1"
                >
                  <User size={20} />
                  Profile
                </a>
                <button
                  onClick={handleLogout}
                  className="lum-btn lum-bg-transparent rounded-lum-1 hover:lum-bg-red-700"
                >
                  <LogOut size={20} />
                  Log out
                </button>
              </>}
            />
          )}
        </>
      }
    />
  );
}