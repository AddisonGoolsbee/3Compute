import '@xterm/xterm/css/xterm.css';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { io, Socket } from 'socket.io-client';
import { backendUrl, UserDataContext } from '../util/UserData';
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
      <div ref={terminalRef} className="w-full h-full overflow-hidden" />
    </div>
  );
}

// Main terminal component with tabs
export default function TerminalTabs() {
  const userData = useContext(UserDataContext);
  const [tabs, setTabs] = useState<string[]>(['1']);
  const [activeTab, setActiveTab] = useState<string>('1');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Function to save tab state to backend
  const saveTabState = useCallback(async (tabsToSave: string[], activeTabToSave: string) => {
    // Only save if user is authenticated
    if (!userData.userInfo) {
      return;
    }
    
    console.log('Saving tab state:', { tabs: tabsToSave, active_tab: activeTabToSave }); // Debug log
    
    try {
      const response = await fetch(`${backendUrl}/tabs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tabs: tabsToSave,
          active_tab: activeTabToSave,
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to save tab state:', response.status, response.statusText);
      } else {
        console.log('Successfully saved tab state'); // Debug log
      }
    } catch (error) {
      console.error('Failed to save tab state:', error);
    }
  }, [userData.userInfo]);

  // Function to load tab state from backend
  const loadTabState = useCallback(async () => {
    // Only try to load if user is authenticated
    if (!userData.userInfo) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/tabs`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded tab state:', data); // Debug log
        if (data.tabs && data.active_tab) {
          setTabs(data.tabs);
          setActiveTab(data.active_tab);
        }
      } else {
        console.error('Failed to load tab state:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load tab state:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userData.userInfo]);

  // Load tab state when user becomes authenticated
  useEffect(() => {
    if (userData.userInfo) {
      loadTabState();
    } else {
      // Reset to default state when user logs out
      setTabs(['1']);
      setActiveTab('1');
      setIsLoading(false);
    }
  }, [userData.userInfo, loadTabState]);

  // Save tab state when tabs or activeTab changes (debounced)
  useEffect(() => {
    if (!isLoading && userData.userInfo) {
      const timeoutId = setTimeout(() => {
        saveTabState(tabs, activeTab);
      }, 100); // Small debounce to avoid too many saves
      
      return () => clearTimeout(timeoutId);
    }
  }, [tabs, activeTab, isLoading, userData.userInfo, saveTabState]);

  // Save tab state when component unmounts
  useEffect(() => {
    return () => {
      if (!isLoading && userData.userInfo) {
        saveTabState(tabs, activeTab);
      }
    };
  }, [tabs, activeTab, isLoading, userData.userInfo, saveTabState]);

  const handleNewTab = useCallback(() => {
    const newTabId = (Math.max(...tabs.map(Number)) + 1).toString();
    const newTabs = [...tabs, newTabId];
    setTabs(newTabs);
    setActiveTab(newTabId);
    // saveTabState will be called automatically by the effect
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
    
    // saveTabState will be called automatically by the effect
  }, [tabs, activeTab]);

  const handleSelectTab = useCallback((tabId: string) => {
    console.log('Selecting tab:', tabId, 'Current tabs:', tabs); // Debug log
    setActiveTab(tabId);
    // saveTabState will be called automatically by the effect
  }, [tabs]);

  if (isLoading) {
    return (
      <div className="w-full h-[30dvh] lum-bg-gray-950 border border-lum-border/40 rounded-lum flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lum-text-secondary">Loading terminals...</div>
        </div>
      </div>
    );
  }

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
