import { Plus, Terminal as TerminalIcon, X } from 'lucide-react';
import { FC } from 'react';
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
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
      {tabs.map((w) => (
        <div
          key={w}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-1.5 border-0 cursor-pointer rounded-t-md font-sans text-[13px] transition-colors group',
            w === active
              ? 'bg-ide-bg border-b-2 border-ochre text-ink-strong'
              : 'bg-transparent border-b-2 border-transparent text-ink-muted hover:text-ink-strong',
          )}
          onClick={() => onSelect(w)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(w);
            }
          }}
        >
          <TerminalIcon size={12} />
          <span>Terminal {w}</span>
          {tabs.length > 1 && (
            <button
              title="Close Terminal"
              onClick={(e) => {
                e.stopPropagation();
                onClose(w);
              }}
              className={cn(
                'inline-flex items-center justify-center p-0.5 rounded-sm cursor-pointer transition-opacity transition-colors hover:text-ink-strong hover:bg-paper-tinted',
                w === active
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100',
              )}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onNew}
        className="text-ink-muted hover:text-ink-strong p-1.5 rounded hover:bg-paper-tinted ml-1 cursor-pointer transition-colors"
        title="New Terminal"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};
