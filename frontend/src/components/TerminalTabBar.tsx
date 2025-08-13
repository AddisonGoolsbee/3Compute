
import { getClasses } from '@luminescent/ui-react';
import { Plus, X } from 'lucide-react';
import { FC } from 'react';

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
    <div className="flex items-center lum-bg-gray-950 border-x-0 border-t-0 p-1 gap-1 overflow-x-scroll">
      {tabs.map((w) => (
        <div
          key={w}
          className={getClasses({
            'lum-btn gap-0 p-0 rounded-lum-1 lum-bg-transparent group relative': true,
            'lum-bg-gray-900 border-x-transparent border-t-transparent border-blue-500/60': w === active,
          })}
        >
          <button
            onClick={() => onSelect(w)}
            className={getClasses({
              'w-full lum-btn-p-1 text-sm transition-colors flex-1 cursor-pointer': true,
              'text-lum-text': w === active,
              'text-lum-text-secondary hover:text-lum-text': w !== active,
            })}
          >
            Terminal {w}
          </button>
          {tabs.length > 1 && (
            <button title="Close Terminal"
              onClick={(e) => {
                e.stopPropagation();
                onClose(w);
              }}
              className={getClasses({
                'lum-btn p-1 h-full rounded-lum-2 text-xs lum-bg-transparent hover:lum-bg-transparent cursor-pointer': true,
                'text-lum-text-secondary hover:text-lum-text': true,
              })}
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onNew}
        className="lum-btn p-0.5 rounded-lum-2 lum-bg-transparent"
        title="New Terminal"
      >
        <Plus size={16} />
      </button>
    </div>
  );
};
