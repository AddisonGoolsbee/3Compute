import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { backendUrl } from '../util/UserData';
import { getClasses } from '@luminescent/ui-react';

interface TerminalSessionProps {
  tabId: string;
  isActive: boolean;
}

export function TerminalSession({ tabId, isActive }: TerminalSessionProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket>(null);
  const terminalInstanceRef = useRef<Terminal>(null);
  const fitAddonRef = useRef<FitAddon>(null);
  const wasActiveRef = useRef<boolean>(isActive);

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
      macOptionClickForcesSelection: true,
      scrollback: 5000,
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
      query: {
        tabId: tabId,
      },
    });
    socketRef.current = socket;

    waitForFitReady(term, fitAddon, socket, () => {
      term.focus();
      term.scrollToBottom();
    });

    term.onData((data) => {
      socket.emit('pty-input', { input: data });
    });

    // Cmd+C (macOS) / Ctrl+Shift+C (Linux) copies selected text
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;
      const isCopy =
        (event.metaKey && event.key === 'c') ||
        (event.ctrlKey && event.shiftKey && event.key === 'C');
      if (isCopy) {
        const selection = term.getSelection();
        if (selection) {
          navigator.clipboard.writeText(selection).catch(() => {});
          return false;
        }
      }
      return true;
    });

    term.onResize(({ cols, rows }) => {
      socket.emit('resize', { cols, rows });
    });

    socket.on('pty-output', (data: { output: string }) => {
      term.write(data.output);
    });

    socket.on('connect_error', (error) => {
      console.error('Terminal connection error:', error);
      if (
        error.message.includes('Unauthorized') ||
        error.message.includes('401')
      ) {
        window.location.href = '/login';
      }
    });

    socket.on('error', (data) => {
      console.error('Server error:', data);
      if (data.message === 'Unauthorized') {
        window.location.href = '/login';
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Terminal disconnected:', reason);
      if (reason === 'io server disconnect') {
        window.location.href = '/login';
      }
    });

    const runHandler = (e: Event) => {
      if (!wasActiveRef.current) return;
      const { command } = (e as CustomEvent<{ command: string }>).detail;
      socket.emit('pty-input', { input: command });
    };
    window.addEventListener('3compute:run-command', runHandler);

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims && socketRef.current) {
          socketRef.current.emit('resize', {
            cols: dims.cols,
            rows: dims.rows,
          });
        }
      }
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      window.removeEventListener('3compute:run-command', runHandler);
      resizeObserver.disconnect();
      socket.disconnect();
      term.dispose();
    };
  }, [tabId]);

  useEffect(() => {
    if (
      isActive &&
      !wasActiveRef.current &&
      terminalInstanceRef.current &&
      fitAddonRef.current
    ) {
      fitAddonRef.current.fit();
      terminalInstanceRef.current.focus();
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  return (
    <div
      className={getClasses({
        'absolute inset-0 w-full h-full': true,
        visible: isActive,
        'invisible pointer-events-none': !isActive,
      })}
      data-tab-id={tabId}
    >
      <div ref={terminalRef} className="w-full h-full overflow-hidden" />
    </div>
  );
}
