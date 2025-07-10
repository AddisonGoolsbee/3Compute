import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";
import { io, Socket } from "socket.io-client";

import { UserInfo } from "../root";

const backendUrl = import.meta.env.VITE_ENVIRONMENT === "production"
  ? import.meta.env.VITE_PROD_BACKEND_URL
  : import.meta.env.VITE_BACKEND_URL;

export default function TerminalComponent({ userInfo }: { userInfo: UserInfo }) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      scrollback: 1000,
    });
    const webLinks = new WebLinksAddon();
    const search = new SearchAddon();
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.loadAddon(webLinks);
    term.loadAddon(search);

    term.open(terminalRef.current);
    requestAnimationFrame(() => {
      fitAddon.fit();
      term.focus();
    });

    const socket = io(backendUrl, {
      withCredentials: true,
    });
    socketRef.current = socket;

    term.onData((data) => {
      socket.emit("pty-input", { input: data });
    });

    socket.on("pty-output", (data: { output: string }) => {
      term.write(data.output);
    });

    return () => {
      socket.disconnect();
      term.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div
        ref={terminalRef}
        className="lum-bg-gray-950 rounded-lum p-2 w-full mx-2 sm:mx-4 border border-lum-border/40"
      />
      <div className="text-sm text-lum-text-secondary mt-2">
        Your available port range: {userInfo.port_start}-{userInfo.port_end}
      </div>
    </div>
  );
}
