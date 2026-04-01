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

  const emitResize = (fit: FitAddon, socket: Socket) => {
    const dims = fit.proposeDimensions();
    if (dims && Number.isFinite(dims.cols) && Number.isFinite(dims.rows) && dims.cols > 0 && dims.rows > 0) {
      socket.emit('resize', { cols: dims.cols, rows: dims.rows });
    }
  };

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
        emitResize(fit, socket);
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

    // Re-fit after layout settles (react-resizable-panels CSS transitions can
    // take up to ~300 ms, so we wait a bit longer than that)
    const deferredFit = setTimeout(() => {
      if (fitAddonRef.current && socketRef.current) {
        fitAddonRef.current.fit();
        emitResize(fitAddonRef.current, socketRef.current);
      }
    }, 400);

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

    socket.on('connect', () => {
      // Refresh file explorer on (re)connect in case files changed while the socket was disconnected
      // (e.g. lesson imported from the /lessons page which has no active socket)
      window.dispatchEvent(new CustomEvent('3compute:files-changed'));
    });

    socket.on('files-changed', () => {
      window.dispatchEvent(new CustomEvent('3compute:files-changed'));
    });

    const runHandler = (e: Event) => {
      if (!wasActiveRef.current) return;
      const { command } = (e as CustomEvent<{ command: string }>).detail;
      socket.emit('pty-input', { input: command });
    };
    window.addEventListener('3compute:run-command', runHandler);

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && socketRef.current) {
        fitAddonRef.current.fit();
        emitResize(fitAddonRef.current, socketRef.current);
      }
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      clearTimeout(deferredFit);
      window.removeEventListener('3compute:run-command', runHandler);
      resizeObserver.disconnect();
      socket.disconnect();
      term.dispose();
    };
  }, [tabId]);

  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      // Defer by one frame so the browser paints the visibility change before we fit.
      // Fitting synchronously leaves the canvas at the wrong size for one frame, showing dots.
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
        if (fitAddonRef.current && socketRef.current) {
          emitResize(fitAddonRef.current, socketRef.current);
        }
        terminalInstanceRef.current?.focus();
      });
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
