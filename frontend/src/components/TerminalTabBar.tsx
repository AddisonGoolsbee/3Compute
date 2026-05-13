import { Plus, Terminal as TerminalIcon, X } from 'lucide-react';
import { FC, KeyboardEvent, useRef } from 'react';
import { cn } from '../util/cn';

export interface TabBarProps {
  /** List of tab identifiers, e.g. ["0","1","2"] */
  tabs: string[];
  /** Currently active tab id */
  active: string;
  /** Called to create a new tab */
  onNew: () => void;
  /** Called to switch to a given tab */
  onSelect: (windowIndex: string) => void;
  /** Called to close a tab */
  onClose: (windowIndex: string) => void;
}

export const TerminalTabBar: FC<TabBarProps> = ({
  tabs,
  active,
  onNew,
  onSelect,
  onClose,
}) => {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, current: string) => {
    const idx = tabs.indexOf(current);
    if (idx < 0) return;
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = tabs.length - 1;
    if (nextIdx !== null) {
      e.preventDefault();
      const nextId = tabs[nextIdx];
      onSelect(nextId);
      tabRefs.current[nextId]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Terminal sessions"
      aria-orientation="horizontal"
      className="flex items-center gap-1 overflow-x-auto scrollbar-hide"
    >
      {tabs.map((w) => {
        const isActive = w === active;
        return (
          <button
            key={w}
            type="button"
            role="tab"
            id={`terminal-tab-${w}`}
            aria-selected={isActive}
            aria-controls={`terminal-panel-${w}`}
            tabIndex={isActive ? 0 : -1}
            ref={(el) => {
              tabRefs.current[w] = el;
            }}
            onClick={() => onSelect(w)}
            onKeyDown={(e) => onTabKeyDown(e, w)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-1.5 border-0 cursor-pointer rounded-t-md font-sans text-[13px] transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30',
              isActive
                ? 'bg-ide-bg border-b-2 border-ochre text-ink-strong'
                : 'bg-transparent border-b-2 border-transparent text-ink-muted hover:text-ink-strong',
            )}
          >
            <TerminalIcon size={12} aria-hidden="true" />
            <span>Terminal {w}</span>
            {tabs.length > 1 && (
              <span
                role="button"
                tabIndex={isActive ? 0 : -1}
                aria-label={`Close terminal ${w}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(w);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose(w);
                  }
                }}
                className={cn(
                  'inline-flex items-center justify-center p-0.5 rounded-sm cursor-pointer transition-opacity transition-colors hover:text-ink-strong hover:bg-paper-tinted',
                  isActive
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100',
                )}
              >
                <X size={12} aria-hidden="true" />
              </span>
            )}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onNew}
        aria-label="New terminal"
        className="text-ink-muted hover:text-ink-strong p-1.5 rounded hover:bg-paper-tinted ml-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/30"
      >
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
};
