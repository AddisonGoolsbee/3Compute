
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
    <div className="flex items-center bg-lum-bg-gray-950/50 border-b border-lum-border/20">
      {tabs.map((w) => (
        <div
          key={w}
          className={`flex items-center group relative ${
            w === active 
              ? 'bg-lum-bg-gray-950 border-b-2 border-blue-500/60' 
              : 'bg-transparent hover:bg-lum-bg-gray-900/50'
          }`}
        >
          <button
            onClick={() => onSelect(w)}
            className={`px-3 py-2 text-sm transition-colors flex-1 ${
              w === active 
                ? 'text-lum-text' 
                : 'text-lum-text-secondary hover:text-lum-text'
            }`}
          >
            Terminal {w}
          </button>
          {tabs.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(w);
              }}
              className={`w-6 h-6 mr-1 flex items-center justify-center text-xs transition-opacity ${
                w === active 
                  ? 'opacity-60 hover:opacity-100 text-lum-text' 
                  : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 text-lum-text-secondary'
              }`}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onNew}
        className="px-3 py-2 text-sm text-lum-text-secondary hover:text-lum-text hover:bg-lum-bg-gray-900/50 transition-colors"
        title="New Terminal"
      >
        +
      </button>
    </div>
  );
};
