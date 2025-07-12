import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";
import { io, Socket } from "socket.io-client";

const backendUrl =
  import.meta.env.VITE_ENVIRONMENT === "production"
    ? import.meta.env.VITE_PROD_BACKEND_URL
    : import.meta.env.VITE_BACKEND_URL;

export default function TerminalComponent() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket>(null);
  const terminalInstanceRef = useRef<Terminal>(null);
  const fitAddonRef = useRef<FitAddon>(null);

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

    terminalInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

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

    // Handle terminal resize events
    term.onResize(({ cols, rows }) => {
      socket.emit("resize", { cols, rows });
    });

    socket.on("pty-output", (data: { output: string }) => {
      term.write(data.output);
    });

    // Set up resize observer to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims && socketRef.current) {
          socketRef.current.emit("resize", {
            cols: dims.cols,
            rows: dims.rows,
          });
        }
      }
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      socket.disconnect();
      term.dispose();
    };
  }, []);

  return (
    <div className="w-full h-[30dvh] p-2 lum-bg-gray-950  border border-lum-border/40 rounded-lum ">
      <div ref={terminalRef} className="w-full h-full overflow-hidden" />
    </div>
  );
}
