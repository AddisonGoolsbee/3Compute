import { Nav, LogoBirdflop } from "@luminescent/ui-react";
import { LogOut, Plus, LogIn } from "lucide-react";
import { useContext, useState } from "react";
import { Link } from "react-router";
import { backendUrl, UserDataContext } from "../util/UserData";
import CreateClassroomDialog from "./CreateClassroomDialog";
import JoinClassroomDialog from "./JoinClassroomDialog";

export default function NavComponent() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const handleLogout = async () => {
    await fetch(`${backendUrl}/logout`, {
      credentials: "include",
    });
    window.location.href = "/";
  };

  const userData = useContext(UserDataContext);

  return (
    <>
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
                onClick={() => setJoinOpen(true)}
                className="lum-btn lum-bg-transparent hover:lum-bg-nav-bg flex items-center gap-1 cursor-pointer select-none text-sm font-medium transition-colors"
              >
                <LogIn size={16} className="opacity-80" />
                <span>Join Classroom</span>
              </button>
            )}
            {userData?.userInfo && (
              <button
                onClick={() => setCreateOpen(true)}
                className="lum-btn lum-bg-transparent hover:lum-bg-nav-bg flex items-center gap-1 cursor-pointer select-none text-sm font-medium transition-colors"
              >
                <Plus size={16} className="opacity-80" />
                <span>Create Classroom</span>
              </button>
            )}
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
      <CreateClassroomDialog
        open={!!userData?.userInfo && createOpen}
        onClose={() => setCreateOpen(false)}
      />
      <JoinClassroomDialog
        open={!!userData?.userInfo && joinOpen}
        onClose={() => setJoinOpen(false)}
      />
    </>
  );
}
