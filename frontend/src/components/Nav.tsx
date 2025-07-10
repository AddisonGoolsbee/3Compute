// @ts-expect-error types not working yet
import { Nav, LogoBirdflop } from "@luminescent/ui-react";
import { LogOut } from "lucide-react";
import { Link } from "react-router";
import { UserInfo } from "../root";
const backendUrl = import.meta.env.VITE_ENVIRONMENT === "production"
  ? import.meta.env.VITE_PROD_BACKEND_URL
  : import.meta.env.VITE_BACKEND_URL;

export default function NavComponent({ userInfo }: { userInfo?: UserInfo }) {
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
          className="lum-btn lum-bg-transparent hover:lum-bg-nav-bg"
        >
          <LogoBirdflop size={24} fillGradient={["#54daf4", "#545eb6"]} />
          <span className="font-semibold -ml-1">3Compute</span>
        </Link>
      }
      center={
        <>
        </>
      }
      end={
        <>
          {userInfo && (
            <button
              onClick={handleLogout}
              className="lum-btn lum-bg-transparent text-red-300 hover:lum-bg-red-700 p-2"
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
