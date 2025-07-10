import { useEffect, useState } from "react";
import Nav from "./components/Nav";
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

  return <>
    <Nav authed={authed} />
    <div className="min-h-screen flex flex-col items-center justify-center">
      {authed === null && <div className="lum-loading animate-spin w-8 h-8 border-6"></div>}
      {authed === false && <Login />}
      {authed === true && <Terminal />}
    </div>
  </>;
}
