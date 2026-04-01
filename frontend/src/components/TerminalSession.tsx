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

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      macOptionClickForcesSelection: true,
      scrollback: 5000,
      theme: { background: '#000000' },
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
      query: { tabId },
    });
    socketRef.current = socket;

    // term.onResize is the single source of truth for sending resize to the backend.
    // It fires with the actual applied dimensions whenever terminal.resize() is called
    // (which fit.fit() does internally). This avoids double-emits that occurred when
    // emitResize() was called explicitly alongside fit.fit().
    term.onResize(({ cols, rows }) => {
      socket.emit('resize', { cols, rows });
    });

    // Poll until the container has real dimensions, then fit and focus.
    const waitForFitReady = () => {
      const width = term.element?.clientWidth ?? 0;
      const height = term.element?.clientHeight ?? 0;
      if (width > 0 && height > 0) {
        fitAddon.fit();
        term.focus();
        term.scrollToBottom();
      } else {
        requestAnimationFrame(waitForFitReady);
      }
    };
    waitForFitReady();

    // Re-fit after layout settles (react-resizable-panels CSS transitions can
    // take up to ~300 ms, so we wait a bit longer than that).
    const deferredFit = setTimeout(() => {
      fitAddonRef.current?.fit();
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
      // Refresh file explorer on (re)connect in case files changed while disconnected.
      window.dispatchEvent(new CustomEvent('3compute:files-changed'));
      // Re-send the current terminal dimensions so the backend PTY stays in sync.
      // We use term.cols/rows (already applied) rather than calling fit.fit() again,
      // which avoids a redundant resize that can shift terminal content.
      if (terminalInstanceRef.current && socketRef.current) {
        const { cols, rows } = terminalInstanceRef.current;
        socketRef.current.emit('resize', { cols, rows });
      }
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
      fitAddonRef.current?.fit();
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
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit();
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
