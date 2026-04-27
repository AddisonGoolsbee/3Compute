import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { backendUrl } from '../util/UserData';
import { cn } from '../util/cn';
import {
  registerTerminalOutput,
  setActiveTerminalTab,
} from '../util/terminalActivity';

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
    shouldAbort: () => boolean,
    callback: () => void,
  ) => {
    let animationFrameId = 0;
    const check = () => {
      if (shouldAbort()) return;
      const width = term.element?.clientWidth ?? 0;
      const height = term.element?.clientHeight ?? 0;
      if (width > 0 && height > 0) {
        try {
          fit.fit();
          const dims = fit.proposeDimensions();
          if (dims) {
            socket.emit('resize', { cols: dims.cols, rows: dims.rows });
          }
          callback();
        } catch (error) {
          console.error('Terminal fit failed during initialization:', error);
        }
      } else {
        animationFrameId = requestAnimationFrame(check);
      }
    };
    check();
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    let disposed = false;
    // Debounce a files-changed dispatch off the tail of pty-output. When a
    // command finishes, output stops and the shell prompt redraws; anything
    // created/removed from the terminal (touch, >, rm, mv, cp, mkdir, etc.)
    // is on disk by then. Polling the file tree 500ms after the last byte is
    // effectively zero-latency for student workflows without adding idle
    // network traffic.
    let fsRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleFsRefresh = () => {
      if (fsRefreshTimer) clearTimeout(fsRefreshTimer);
      fsRefreshTimer = setTimeout(() => {
        fsRefreshTimer = null;
        if (disposed) return;
        window.dispatchEvent(new CustomEvent('3compute:files-changed'));
      }, 500);
    };

    const term = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      macOptionClickForcesSelection: true,
      scrollback: 5000,
      fontFamily: '"DM Mono", ui-monospace, Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      theme: {
        background: '#fbf7ec', // --ide-bg
        foreground: '#2d2d35', // --ink-default
        cursor: '#1a1a1f', // --ink-strong
        cursorAccent: '#fbf7ec',
        selectionBackground: '#d8e3eecc', // --c-navy-soft @ ~80%
        selectionForeground: '#1a1a1f',
        black: '#1a1a1f', // --ink-strong (ANSI 0)
        red: '#e85d3f', // --c-tomato
        green: '#2d6a4f', // --c-forest
        yellow: '#b07a1f', // darkened ochre — bright yellow on cream is unreadable
        blue: '#1f4e79', // --c-navy
        magenta: '#6d3aed', // --c-plum
        cyan: '#0e7490', // teal complement
        white: '#6b6a6e', // --ink-muted (default "white" reads as quiet text)
        brightBlack: '#908e8a', // --ink-subtle
        brightRed: '#d24e32',
        brightGreen: '#2d6a4f',
        brightYellow: '#e09733', // --c-ochre full strength
        brightBlue: '#1f4e79',
        brightMagenta: '#6d3aed',
        brightCyan: '#0e7490',
        brightWhite: '#1a1a1f', // --ink-strong (most-emphasized text)
      },
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

    const stopWaiting = waitForFitReady(
      term,
      fitAddon,
      socket,
      () => disposed,
      () => {
        term.focus();
        term.scrollToBottom();
      },
    );

    term.onData((data) => {
      // xterm.js auto-responds to ESC[6n (cursor position query) with
      // ESC[row;colR.  When ash handles SIGWINCH on dtach reattach, it sends
      // ESC[6n and the CPR response arrives at the PTY as input.  While a
      // child process is running (cooked mode), the terminal echoes it as
      // ^[[row;colR literal text.  Filter these out before forwarding.
      // eslint-disable-next-line no-control-regex
      const filtered = data.replace(/\x1b\[\d+;\d+R/g, '');
      if (filtered) socket.emit('pty-input', { input: filtered });
    });

    // Cmd+C (macOS) / Ctrl+Shift+C (Linux) copies selected text
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;
      const isCopy = (event.metaKey && event.key === 'c') || (event.ctrlKey && event.shiftKey && event.key === 'C');
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

    socket.on('connect', () => {
      if (disposed) return;
      // Re-emit resize after socket connects (or reconnects) so the backend
      // always has the correct terminal dimensions.
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
          const dims = fitAddonRef.current.proposeDimensions();
          if (dims) {
            socket.emit('resize', { cols: dims.cols, rows: dims.rows });
          }
        } catch (error) {
          console.error('Terminal fit failed on socket connect:', error);
        }
      }
    });

    socket.on('pty-output', (data: { output: string }) => {
      term.write(data.output);
      registerTerminalOutput(tabId);
      scheduleFsRefresh();
    });

    socket.on('connect_error', (error) => {
      console.error('Terminal connection error:', error);
      if (error.message.includes('Unauthorized') || error.message.includes('401')) {
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

    socket.on('files-changed', () => {
      window.dispatchEvent(new CustomEvent('3compute:files-changed'));
    });

    socket.on('terminal-restart-required', () => {
      window.dispatchEvent(
        new CustomEvent('terminal-restart-required', {
          detail: { reason: 'pty-died' },
        }),
      );
    });

    const runHandler = (e: Event) => {
      if (!wasActiveRef.current) return;
      const { command } = (e as CustomEvent<{ command: string }>).detail;
      socket.emit('pty-input', { input: command });
    };
    window.addEventListener('3compute:run-command', runHandler);

    const resizeObserver = new ResizeObserver(() => {
      if (disposed) return;
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
          const dims = fitAddonRef.current.proposeDimensions();
          if (dims && socketRef.current) {
            socketRef.current.emit('resize', {
              cols: dims.cols,
              rows: dims.rows,
            });
          }
        } catch (error) {
          console.error('Terminal fit failed during resize:', error);
        }
      }
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      disposed = true;
      stopWaiting();
      window.removeEventListener('3compute:run-command', runHandler);
      resizeObserver.disconnect();
      if (fsRefreshTimer) clearTimeout(fsRefreshTimer);
      socket.disconnect();
      term.dispose();
    };
  }, [tabId]);

  useEffect(() => {
    if (isActive && !wasActiveRef.current && terminalInstanceRef.current && fitAddonRef.current) {
      fitAddonRef.current.fit();
      terminalInstanceRef.current.focus();
    }
    wasActiveRef.current = isActive;
    if (isActive) setActiveTerminalTab(tabId);
  }, [isActive, tabId]);

  return (
    <div
      className={cn(
        'absolute inset-0 w-full h-full',
        isActive ? 'visible' : 'invisible pointer-events-none',
      )}
      data-tab-id={tabId}
    >
      <div
        ref={terminalRef}
        className="bg-ide-bg w-full h-full overflow-hidden px-1"
      />
    </div>
  );
}
