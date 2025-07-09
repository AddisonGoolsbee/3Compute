import { useEffect, useState } from "react";
import Terminal from "./components/Terminal";
import Login from "./components/Login";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${backendUrl}/me`, { credentials: "include" });
        setAuthed(res.ok);
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
      {authed === true && <Terminal />}
    </div>
  );
}
