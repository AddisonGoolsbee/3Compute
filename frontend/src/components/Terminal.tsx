import { useEffect, useState, useCallback, useContext } from 'react';
import { apiUrl, UserDataContext } from '../util/UserData';
import { TerminalTabBar } from './TerminalTabBar';
import { getClasses } from '@luminescent/ui-react';
import { Globe } from 'lucide-react';
import PortsPanel from './PortsPanel';
import { TerminalSession } from './TerminalSession';

// Suppress the Ctrl+Shift+C copy hint on macOS where Cmd+C works as expected.
const isMacLike =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

export default function TerminalTabs() {
  const userData = useContext(UserDataContext);
  const [tabs, setTabs] = useState<string[]>(['1']);
  const [activeTab, setActiveTab] = useState<string>('1');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [restartToken, setRestartToken] = useState<number>(0); // bump to remount terminals
  const [showPorts, setShowPorts] = useState(false);

  // Listen for restart event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log('Terminal restart requested', detail);
      // Force re-mount by updating key state; preserve tab structure
      setRestartToken(Date.now());
    };
    window.addEventListener(
      'terminal-restart-required',
      handler as EventListener,
    );
    return () =>
      window.removeEventListener(
        'terminal-restart-required',
        handler as EventListener,
      );
  }, []);

  // Function to save tab state to backend
  const saveTabState = useCallback(
    async (tabsToSave: string[], activeTabToSave: string) => {
      // Only save if user is authenticated
      if (!userData.userInfo) {
        return;
      }

      // console.log('Saving tab state:', {
      //   tabs: tabsToSave,
      //   active_tab: activeTabToSave,
      // }); // Debug log

      try {
        const response = await fetch(`${apiUrl}/tabs/`, {
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
          console.error(
            'Failed to save tab state:',
            response.status,
            response.statusText,
          );
        } else {
          // console.log('Successfully saved tab state'); // Debug log
        }
      } catch (error) {
        console.error('Failed to save tab state:', error);
      }
    },
    [userData.userInfo],
  );

  // Function to load tab state from backend
  const loadTabState = useCallback(async () => {
    // Only try to load if user is authenticated
    if (!userData.userInfo) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/tabs/`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // console.log('Loaded tab state:', data); // Debug log
        if (data.tabs && data.active_tab) {
          setTabs(data.tabs);
          setActiveTab(data.active_tab);
        }
      } else {
        console.error(
          'Failed to load tab state:',
          response.status,
          response.statusText,
        );
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

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (tabs.length === 1) {
        // Don't allow closing the last tab
        return;
      }

      // Request backend to kill all processes for this tab (tmux session)
      fetch(`${apiUrl}/terminal/close-tab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tabId }),
      }).catch(() => {});

      const newTabs = tabs.filter((id) => id !== tabId);
      setTabs(newTabs);

      // If we closed the active tab, switch to the first remaining tab
      if (activeTab === tabId) {
        setActiveTab(newTabs[0]);
      }

      // saveTabState will be called automatically by the effect
    },
    [tabs, activeTab],
  );

  const handleSelectTab = useCallback(
    (tabId: string) => {
      // console.log('Selecting tab:', tabId, 'Current tabs:', tabs); // Debug log
      setActiveTab(tabId);
      // saveTabState will be called automatically by the effect
    },
    [tabs],
  );

  if (isLoading) {
    return (
      <div className="w-full h-full lum-bg-gray-950 border border-lum-border/40 rounded-lum flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lum-text-secondary">Loading terminals...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full lum-bg-gray-950 border border-lum-border/40 rounded-lum flex flex-col overflow-hidden">
      <div className="flex items-center">
        <div className="flex-1 min-w-0">
          <TerminalTabBar
            tabs={tabs}
            active={activeTab}
            onNew={handleNewTab}
            onSelect={handleSelectTab}
            onClose={handleCloseTab}
          />
        </div>
        {!isMacLike && (
          <span
            className="hidden md:inline text-xs text-gray-500 px-2 select-none flex-shrink-0"
            title="Plain Ctrl+C interrupts the running program (sends SIGINT)"
          >
            Ctrl+Shift+C to copy
          </span>
        )}
        {/* Ports button */}
        <div className="relative flex-shrink-0 pr-1">
          <button
            onClick={() => setShowPorts((v) => !v)}
            title="Public URLs"
            className={getClasses({
              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer': true,
              'text-[#54daf4] bg-[#54daf4]/10': showPorts,
              'text-gray-500 hover:text-gray-300': !showPorts,
            })}
          >
            <Globe size={14} />
            <span className="hidden sm:inline">Ports</span>
          </button>
          <PortsPanel open={showPorts} onClose={() => setShowPorts(false)} />
        </div>
      </div>
      <div className="flex-1 relative">
        {tabs.map((tabId) => (
          <TerminalSession
            key={tabId + '-' + restartToken}
            tabId={tabId}
            isActive={activeTab === tabId}
          />
        ))}
      </div>
    </div>
  );
}
