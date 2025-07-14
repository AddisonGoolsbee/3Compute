// @ts-expect-error types not working yet
import { Nav, LogoBirdflop } from "@luminescent/ui-react";
import { LogOut } from "lucide-react";
import { useContext } from "react";
import { Link } from "react-router";
import { backendUrl, UserDataContext } from "../util/UserData";

export default function NavComponent() {
  const handleLogout = async () => {
    await fetch(`${backendUrl}/logout`, {
      credentials: "include",
    });
    window.location.href = "/";
  };

  const userData = useContext(UserDataContext);

  return (
    <Nav
      start={
        <Link
          to="/"
          className="lum-btn lum-bg-transparent hover:lum-bg-nav-bg"
        >
          <LogoBirdflop size={24} fillGradient={["#54daf4", "#545eb6"]} />
          <span className="font-semibold -ml-1">3Compute</span>
        </Link>
      }
      end={
        <>
          {userData?.userInfo && (
            <button
              onClick={handleLogout}
              className="lum-btn lum-bg-transparent text-red-300 hover:lum-bg-red-700"
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
