import {
  ChevronDown, ChevronRight, ClipboardCopy, Copy, ClipboardPaste, Download, Eye, FileIcon,
  Folder, FolderOpen, Pencil, Plus, Terminal as TerminalIcon, Trash, Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../util/cn';
import { languageMap } from '../util/languageMap';

/** Demo-only Explorer panel that mirrors the visuals of components/Explorer
 *  and components/MenuItems. Pure presentational — no UserDataContext, no
 *  fetches against /api/files, no drag-drop or rename. The buttons are
 *  rendered to match the IDE's chrome but are no-ops with a "demo mode"
 *  hint so the marketing demo looks identical to the real product.
 *
 *  Right-click on a row opens the same context menu as the real Explorer,
 *  with the actions that work without server mutations (Copy path, Open in
 *  terminal, Download for files) live and the rest disabled with a tooltip
 *  pointing at sign-up. */

export interface DemoFileTreeNode {
  name: string;
  /** Either a file (no children) or a folder (children present, even if empty). */
  children?: DemoFileTreeNode[];
  /** Stable unique path for selection state. Files only. */
  path?: string;
}

export interface DemoExplorerPanelProps {
  tree: DemoFileTreeNode[];
  /** Path of the currently selected/open file (for highlight). */
  activePath: string | null;
  onOpenFile: (path: string) => void;
  /** Initially expanded folder names (root-relative slash paths). */
  initialOpenFolders?: string[];
  /** Provide the file content for Download. The panel handles the rest
   *  (creates a Blob, triggers an `<a download>`). Returns ``null`` for
   *  paths that aren't downloadable. */
  getFileContent?: (path: string) => string | undefined;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  /** Path of the right-clicked item, ``null`` for blank-space. */
  path: string | null;
  /** True when the click target was a folder (or blank space). */
  isFolder: boolean;
}

const ctxItem = 'flex items-center gap-2 px-3 py-1.5 text-sm w-full text-left cursor-pointer text-ink-default hover:bg-paper-tinted hover:text-ink-strong';
const ctxItemDisabled = 'flex items-center gap-2 px-3 py-1.5 text-sm w-full text-left cursor-not-allowed text-ink-faint';

export function DemoExplorerPanel({
  tree, activePath, onOpenFile, initialOpenFolders = [], getFileContent,
}: DemoExplorerPanelProps) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(
    () => new Set(initialOpenFolders),
  );
  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, path: null, isFolder: false,
  });

  const toggle = (key: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const closeMenu = () => setMenu((m) => ({ ...m, visible: false }));

  // Close on outside click / Escape, like the real menu.
  useEffect(() => {
    if (!menu.visible) return;
    const onClick = () => closeMenu();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu.visible]);

  const showMenu = (e: React.MouseEvent, path: string | null, isFolder: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ visible: true, x: e.clientX, y: e.clientY, path, isFolder });
  };

  // ----- Context-menu actions -----------------------------------------

  const copyPath = async () => {
    if (!menu.path) return;
    const trimmed = menu.path.replace(/\/$/, '');
    const text = trimmed ? `~${trimmed}` : '~';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copy path', text);
    }
    closeMenu();
  };

  const openInTerminal = () => {
    if (!menu.path) return;
    // Resolve to the directory: folders use their own path; files use parent.
    const trimmed = menu.path.replace(/\/$/, '');
    const dir = menu.isFolder ? trimmed : trimmed.split('/').slice(0, -1).join('/');
    const rel = dir.replace(/^\//, '');
    const escaped = rel.replace(/'/g, '\'\\\'\'');
    const command = rel ? `cd ~/'${escaped}'\n` : 'cd ~\n';
    window.dispatchEvent(new CustomEvent('csroom:run-command', { detail: { command } }));
    closeMenu();
  };

  const downloadFile = () => {
    if (!menu.path || menu.isFolder) return;
    const content = getFileContent?.(menu.path);
    if (content === undefined) {
      closeMenu();
      return;
    }
    const name = menu.path.split('/').pop() ?? 'download.txt';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closeMenu();
  };

  return (
    <div className="flex flex-col h-full w-full bg-ide-bg border border-ide-rule rounded-lg p-1.5 gap-1.5">
      <div className="flex flex-col gap-1.5 p-1.5 bg-ide-elevated rounded-md">
        <div className="flex items-center gap-2 px-1 py-0.5">
          <Folder size={15} className="text-ochre" />
          <span className="text-sm font-semibold text-ink-strong">Files</span>
          <button
            type="button"
            title="Show hidden files (disabled in demo)"
            className="ml-auto p-1 rounded text-ink-muted opacity-60 cursor-not-allowed"
            disabled
            aria-label="Show hidden files"
          >
            <Eye size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled
            title="Disabled in demo"
            className="bg-paper-elevated text-ink-default border border-ide-rule px-2 py-1.5 rounded-sm text-xs font-medium cursor-not-allowed opacity-60 font-sans inline-flex items-center justify-center gap-1.5 w-full"
          >
            <Upload size={12} />
            Upload
          </button>
          <button
            type="button"
            disabled
            title="Disabled in demo"
            className="bg-paper-elevated text-ink-default border border-ide-rule px-2 py-1.5 rounded-sm text-xs font-medium cursor-not-allowed opacity-60 font-sans inline-flex items-center justify-center gap-1.5 w-full"
          >
            <Plus size={12} />
            New
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide p-0.5"
        onContextMenu={(e) => {
          // Blank-space right click. Treat the current selection or root as
          // the implicit folder target.
          if ((e.target as HTMLElement).closest('[data-explorer-item]')) return;
          showMenu(e, null, true);
        }}
      >
        <DemoTreeRows
          nodes={tree}
          depth={0}
          parentPath=""
          openFolders={openFolders}
          onToggle={toggle}
          activePath={activePath}
          onOpenFile={onOpenFile}
          onContextMenu={showMenu}
        />
      </div>

      {menu.visible && (
        <div
          className="fixed bg-paper-elevated border border-rule-soft rounded-md shadow-md py-1.5 min-w-[200px] z-50"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* New submenu (disabled placeholder) */}
          <button className={ctxItemDisabled} disabled title="Sign up to create files in your own workspace.">
            <Plus size={14} className="text-ink-faint" />
            New
            <ChevronRight size={14} className="ml-auto text-ink-faint" />
          </button>
          <div className="my-1 border-t border-rule-soft" />

          {/* File-specific: Download */}
          {menu.path && !menu.isFolder && (
            <button className={ctxItem} onClick={downloadFile}>
              <Download size={14} className="text-ink-muted" />
              Download
            </button>
          )}

          {/* Copy / Paste — disabled in demo (would need backend) */}
          {menu.path && !menu.isFolder && (
            <button className={ctxItemDisabled} disabled title="Sign up to copy/paste files in your own workspace.">
              <Copy size={14} className="text-ink-faint" />
              Copy
            </button>
          )}
          <button className={ctxItemDisabled} disabled title="Sign up to copy/paste files in your own workspace.">
            <ClipboardPaste size={14} className="text-ink-faint" />
            Paste
          </button>

          {/* Copy path — works */}
          {menu.path && (
            <button className={ctxItem} onClick={copyPath}>
              <ClipboardCopy size={14} className="text-ink-muted" />
              Copy path
            </button>
          )}

          {/* Open in terminal — works (dispatches to DemoTerminal) */}
          {menu.path && (
            <button className={ctxItem} onClick={openInTerminal}>
              <TerminalIcon size={14} className="text-ink-muted" />
              Open in terminal
            </button>
          )}

          {/* Rename / Delete — disabled */}
          {menu.path && (
            <>
              <div className="my-1 border-t border-rule-soft" />
              <button className={ctxItemDisabled} disabled title="Sign up to rename files in your own workspace.">
                <Pencil size={14} className="text-ink-faint" />
                Rename
              </button>
              <button className={ctxItemDisabled} disabled title="Sign up to delete files in your own workspace.">
                <Trash size={14} className="text-ink-faint" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DemoTreeRows({
  nodes, depth, parentPath, openFolders, onToggle, activePath, onOpenFile, onContextMenu,
}: {
  nodes: DemoFileTreeNode[];
  depth: number;
  parentPath: string;
  openFolders: Set<string>;
  onToggle: (k: string) => void;
  activePath: string | null;
  onOpenFile: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, path: string, isFolder: boolean) => void;
}) {
  return (
    <>
      {nodes.map((node) => {
        const isFolder = !!node.children;
        const fullKey = `${parentPath}/${node.name}`;
        const expanded = openFolders.has(fullKey);
        const filePath = node.path ?? fullKey;
        const isActive = !isFolder && filePath === activePath;
        const Icon = isFolder
          ? (expanded ? FolderOpen : Folder)
          : (Object.values(languageMap).find((l) =>
            l.extensions.includes(node.name.split('.').pop() ?? ''),
          )?.icon ?? FileIcon);

        return (
          <div key={fullKey}>
            <div
              className={cn(
                'rounded-sm flex items-center select-none',
                isActive ? 'bg-paper-tinted' : 'hover:bg-paper-tinted/60',
              )}
              data-explorer-item
              data-kind={isFolder ? 'folder' : 'file'}
              onContextMenu={(e) => onContextMenu(e, filePath, isFolder)}
            >
              <button
                type="button"
                onClick={() => {
                  if (isFolder) onToggle(fullKey);
                  else onOpenFile(filePath);
                }}
                className={cn(
                  'flex flex-1 items-center gap-1.5 w-full min-w-0 text-left py-1 px-2 bg-transparent border-0 font-sans cursor-pointer',
                  'text-[13.5px]',
                  isActive ? 'font-semibold text-ink-strong' : 'font-normal text-ink-strong',
                )}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
              >
                {isFolder ? (
                  <>
                    <span className="inline-flex w-3 text-ink-muted shrink-0">
                      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                    <Icon size={14} className="shrink-0 text-ochre" />
                  </>
                ) : (
                  <>
                    <span className="inline-block w-3 shrink-0" />
                    <Icon size={13} className="shrink-0 text-ink-muted" />
                  </>
                )}
                <span className="flex-1 truncate min-w-0">{node.name}</span>
              </button>
            </div>
            {isFolder && expanded && node.children && (
              <DemoTreeRows
                nodes={node.children}
                depth={depth + 1}
                parentPath={fullKey}
                openFolders={openFolders}
                onToggle={onToggle}
                activePath={activePath}
                onOpenFile={onOpenFile}
                onContextMenu={onContextMenu}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
