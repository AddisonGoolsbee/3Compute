import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { backendUrl } from '../util/UserData';

export default function TerminalComponent() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket>(null);
  const terminalInstanceRef = useRef<Terminal>(null);
  const fitAddonRef = useRef<FitAddon>(null);

  const waitForFitReady = (
    term: Terminal,
    fit: FitAddon,
    socket: Socket,
    callback: () => void,
  ) => {
    const check = () => {
      const width = term.element?.clientWidth ?? 0;
      const height = term.element?.clientHeight ?? 0;
      if (width > 0 && height > 0) {
        fit.fit();
        const dims = fit.proposeDimensions();
        if (dims) {
          socket.emit('resize', { cols: dims.cols, rows: dims.rows });
          console.log('Manual resize sent', dims);
        }
        callback();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  };

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

    const socket = io(backendUrl, {
      withCredentials: true,
    });
    socketRef.current = socket;

    waitForFitReady(term, fitAddon, socket, () => term.focus());

    term.onData((data) => {
      socket.emit('pty-input', { input: data });
    });

    // Handle terminal resize events (only for if the user resizes the terminal, not if the browser resizes)
    term.onResize(({ cols, rows }) => {
      console.log('Terminal resized to', cols, rows);
      socket.emit('resize', { cols, rows });
    });

    socket.on('pty-output', (data: { output: string }) => {
      console.log('Received output:', JSON.stringify(data.output));
      term.write(data.output);
    });

    // Handle authentication errors
    socket.on('connect_error', (error) => {
      console.error('Terminal connection error:', error);
      if (
        error.message.includes('Unauthorized') ||
        error.message.includes('401')
      ) {
        // Redirect to login or show logout message
        window.location.href = '/login';
      }
    });

    // Handle error events from server
    socket.on('error', (data) => {
      console.error('Server error:', data);
      if (data.message === 'Unauthorized') {
        window.location.href = '/login';
      }
    });

    // Handle disconnect events
    socket.on('disconnect', (reason) => {
      console.log('Terminal disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, likely due to auth issues
        window.location.href = '/login';
      }
    });

    // Set up resize observer to handle container size changes
    // const resizeObserver = new ResizeObserver(() => {
    //   if (fitAddonRef.current) {
    //     fitAddonRef.current.fit();
    //     const dims = fitAddonRef.current.proposeDimensions();
    //     if (dims && socketRef.current) {
    //       socketRef.current.emit('resize', {
    //         cols: dims.cols,
    //         rows: dims.rows,
    //       });
    //     }
    //   }
    // });

    // resizeObserver.observe(terminalRef.current);

    return () => {
      // resizeObserver.disconnect();
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
