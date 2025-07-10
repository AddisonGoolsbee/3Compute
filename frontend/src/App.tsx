import { useEffect, useState } from "react";
import Terminal from "./components/Terminal";
import Login from "./components/Login";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export interface UserInfo {
  email: string;
  port_start: number;
  port_end: number;
}

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${backendUrl}/me`, { credentials: "include" });
        setAuthed(res.ok);
        if (res.ok) {
          const userInfo: UserInfo = await res.json();
          setUserInfo(userInfo);
        }
      } catch {
        setAuthed(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center">
      {authed === null && <div className="flex gap-4 items-center text-3xl font-bold">
        <div className="lum-loading animate-spin w-8 h-8 border-6"></div>
        Loading...
      </div>}
      {authed === false && <>
        <div className="text-3xl font-bold tracking-wider mb-4">
          Birdflop Server Access
        </div>
        <Login />
      </>}
      {authed === true && userInfo && <Terminal userInfo={userInfo} />}
    </div>
  );
}
