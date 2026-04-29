import { useEffect, useState, lazy, Suspense } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '../util/cn';
import { TerminalTabBar } from './TerminalTabBar';

// Lazy-loaded so xterm (browser-only, references `self` at module init) is
// never evaluated server-side during the prerender pass.
const DemoTerminal = lazy(() =>
  import('./DemoTerminal').then((m) => ({ default: m.DemoTerminal })),
);

const isMacLike =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

/** Demo-only Terminal panel that mirrors the visuals of components/Terminal:
 *  same wrapper, same TerminalTabBar, same Ports button, same macOS hint
 *  bar — but the body is the simulated DemoTerminal and the Ports popup
 *  is a static "sign up to use" message. */

interface DemoTerminalPanelProps {
  files: Record<string, string>;
  greeting?: string;
  initialCwd?: string;
  promptUser?: string;
}

export function DemoTerminalPanel({
  files, greeting, initialCwd, promptUser,
}: DemoTerminalPanelProps) {
  const [tabs, setTabs] = useState<string[]>(['1']);
  const [activeTab, setActiveTab] = useState<string>('1');
  const [showPorts, setShowPorts] = useState(false);

  // Listen for run commands from the demo editor and forward them as
  // visible lines in the active terminal. The real IDE has the same event
  // shape; here we just print the command so the user sees something
  // happen when they click Run.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { command?: string } | undefined;
      const cmd = detail?.command?.trim();
      if (!cmd) return;
      // The real terminal pipes this into the PTY. The DemoTerminal listens
      // for the same event in a separate effect (see component below).
      window.dispatchEvent(new CustomEvent('csroom:demo-run', { detail: { command: cmd } }));
    };
    window.addEventListener('csroom:run-command', handler as EventListener);
    return () => window.removeEventListener('csroom:run-command', handler as EventListener);
  }, []);

  const handleNewTab = () => {
    const newTabId = (Math.max(...tabs.map(Number)) + 1).toString();
    setTabs([...tabs, newTabId]);
    setActiveTab(newTabId);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((id) => id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId) setActiveTab(newTabs[0]);
  };

  return (
    <div className="bg-ide-bg border border-ide-rule rounded-lg overflow-hidden flex flex-col h-full">
      <div className="flex items-center bg-ide-elevated border-b border-ide-rule p-1.5 gap-1">
        <div className="flex-1 min-w-0">
          <TerminalTabBar
            tabs={tabs}
            active={activeTab}
            onNew={handleNewTab}
            onSelect={setActiveTab}
            onClose={handleCloseTab}
          />
        </div>
        <div className="relative flex-shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => setShowPorts((v) => !v)}
            title="Public URLs"
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors cursor-pointer',
              showPorts
                ? 'bg-paper-tinted text-ink-strong'
                : 'text-ink-muted hover:bg-paper-tinted hover:text-ink-strong',
            )}
          >
            <Globe size={14} />
            <span className="hidden sm:inline">Ports</span>
          </button>
          {showPorts && <DemoPortsPopup onClose={() => setShowPorts(false)} />}
        </div>
      </div>
      <div className="flex-1 relative bg-ide-bg">
        <Suspense fallback={null}>
          {tabs.map((tabId) => (
            <div
              key={tabId}
              className={cn(
                'absolute inset-0',
                tabId === activeTab ? '' : 'invisible pointer-events-none',
              )}
            >
              <DemoTerminal
                files={files}
                greeting={tabId === '1' ? greeting : undefined}
                initialCwd={initialCwd}
                promptUser={promptUser}
              />
            </div>
          ))}
        </Suspense>
      </div>
      {!isMacLike && (
        <div
          className="bg-paper-tinted border-t border-rule-soft px-3 py-1.5 text-[11.5px] text-ink-muted font-sans"
          title="Plain Ctrl+C interrupts the running program (sends SIGINT)"
        >
          Ctrl+Shift+C to copy
        </div>
      )}
    </div>
  );
}

function DemoPortsPopup({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-50 bg-paper-elevated border border-rule-soft rounded-md shadow-md p-3.5 min-w-[280px]">
        <div className="eyebrow text-tomato mb-1.5">Ports</div>
        <p className="body-sm m-0">
          Real workspaces let you expose a running app on{' '}
          <code className="bg-paper-tinted text-navy font-mono px-1 py-0.5 rounded-sm text-[12px]">
            your-name.app.csroom.org
          </code>
          . Sign up to use this.
        </p>
      </div>
    </>
  );
}
