import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { backendUrl } from '../util/UserData';
import { TerminalTabBar } from './TerminalTabBar';

interface TerminalComponentProps {
  tabId: string;
  isActive: boolean;
}

export function TerminalComponent({ tabId, isActive }: TerminalComponentProps) {
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

    // Handle terminal resize events (only for if the user resizes the terminal, not if the browser resizes)
    term.onResize(({ cols, rows }) => {
      socket.emit('resize', { cols, rows });
    });

    socket.on('pty-output', (data: { output: string }) => {
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
      resizeObserver.disconnect();
      socket.disconnect();
      term.dispose();
    };
  }, [tabId]);

  // Handle tab switching - basic refit when becoming active
  useEffect(() => {
    if (isActive && !wasActiveRef.current && terminalInstanceRef.current && fitAddonRef.current) {
      // Tab became active, just refit and focus
      fitAddonRef.current.fit();
      terminalInstanceRef.current.focus();
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  return (
    <div
      className={`absolute inset-0 w-full h-full ${isActive ? 'visible' : 'invisible pointer-events-none'}`}
      data-tab-id={tabId}
      onClick={() => {
        // Ensure terminal gets focus when clicked
        if (isActive && terminalInstanceRef.current) {
          terminalInstanceRef.current.focus();
        }
      }}
    >
      <div ref={terminalRef} className="w-full h-full overflow-hidden p-3" />
    </div>
  );
}

// Main terminal component with tabs
export default function TerminalTabs() {
  const [tabs, setTabs] = useState<string[]>(['1']);
  const [activeTab, setActiveTab] = useState<string>('1');

  const handleNewTab = useCallback(() => {
    const newTabId = (Math.max(...tabs.map(Number)) + 1).toString();
    setTabs([...tabs, newTabId]);
    setActiveTab(newTabId);
  }, [tabs]);

  const handleCloseTab = useCallback((tabId: string) => {
    if (tabs.length === 1) {
      // Don't allow closing the last tab
      return;
    }

    const newTabs = tabs.filter(id => id !== tabId);
    setTabs(newTabs);

    // If we closed the active tab, switch to the first remaining tab
    if (activeTab === tabId) {
      setActiveTab(newTabs[0]);
    }
  }, [tabs, activeTab]);

  const handleSelectTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className="w-full h-[30dvh] lum-bg-gray-950 border border-lum-border/40 rounded-lum flex flex-col overflow-hidden">
      <TerminalTabBar
        tabs={tabs}
        active={activeTab}
        onNew={handleNewTab}
        onSelect={handleSelectTab}
        onClose={handleCloseTab}
      />
      <div className="flex-1 relative">
        {tabs.map((tabId) => (
          <TerminalComponent
            key={tabId}
            tabId={tabId}
            isActive={activeTab === tabId}
          />
        ))}
      </div>
    </div>
  );
}
