
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
}

export const TerminalTabBar: FC<TabBarProps> = ({
  tabs,
  active,
  onNew,
  onSelect,
}) => {
  return (
    <div className="flex gap-1">
      {tabs.map((w) => (
        <button
          key={w}
          onClick={() => onSelect(w)}
          className={`px-2 py-1 rounded ${
            w === active ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}
        >
          {`Tab ${w}`}
        </button>
      ))}
      <button
        onClick={onNew}
        className="px-2 py-1 rounded bg-green-500 text-white"
      >
        + New Tab
      </button>
    </div>
  );
};
