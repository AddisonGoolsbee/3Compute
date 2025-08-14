
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
    <div className="flex items-center lum-bg-gray-950 border-x-0 border-t-0 p-1 pb-0 gap-1 overflow-x-scroll">
      {tabs.map((w) => (
        <div
          key={w}
          className={getClasses({
            'lum-btn gap-0 rounded-lum-1 p-0 rounded-b-none lum-bg-transparent group relative fade-in-fast border-b-3 hover:border-b-3 border-transparent hover:border-transparent': true,
            'border-b-blue-500/60 hover:border-b-blue-500 lum-bg-gray-800 hover:lum-bg-gray-700': w === active,
            'hover:lum-bg-gray-900': w !== active,
          })}
        >
          <button
            onClick={() => onSelect(w)}
            className={getClasses({
              'w-full px-3 py-1.5 text-sm transition-colors flex-1 cursor-pointer': true,
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
                'lum-btn p-1.5 pr-2 h-full rounded-lum-2 text-xs lum-bg-transparent hover:lum-bg-transparent cursor-pointer': true,
                'opacity-0 group-hover:opacity-100': w !== active,
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
        className={getClasses({
          'lum-btn p-1 h-full rounded-lum-2 text-xs lum-bg-transparent hover:lum-bg-transparent cursor-pointer': true,
          'text-lum-text-secondary hover:text-lum-text': true,
        })}
        title="New Terminal"
      >
        <Plus size={16} />
      </button>
    </div>
  );
};
