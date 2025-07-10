// @ts-expect-error types not working yet
import { Nav, LogoBirdflop } from "@luminescent/ui-react";
import { Folder, LogOut, Terminal } from "lucide-react";
import { Link } from "react-router";
const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function NavComponent({ authed }: { authed: boolean | null }) {
  const handleLogout = async () => {
    await fetch(`${backendUrl}/logout`, {
      credentials: "include",
    });
    window.location.href = "/";
  };
  return (
    <Nav
      start={
        <Link
          to="/"
          className="lum-btn lum-bg-transparent hover:lum-bg-nav-bg p-2"
        >
          <LogoBirdflop size={24} fillGradient={["#54daf4", "#545eb6"]} />
          <span className="font-semibold -ml-1">paas</span>
        </Link>
      }
      center={
        <>
          <Link
            to="/"
            className="lum-btn lum-bg-transparent hover:lum-bg-nav-bg p-2"
          >
            <Terminal size={20} />
            Terminal
          </Link>
          <Link
            to="/files"
            className="lum-btn lum-bg-transparent hover:lum-bg-nav-bg p-2"
          >
            <Folder size={20} />
            Files
          </Link>
        </>
      }
      end={
        <>
          {authed === true && (
            <button
              onClick={handleLogout}
              className="lum-btn lum-bg-transparent hover:lum-bg-red-700 p-2"
            >
              <LogOut size={20} />
            </button>
          )}
        </>
      }
    />
  );
}
