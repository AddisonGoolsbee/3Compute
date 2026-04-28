import { ChevronDown, ChevronRight, ClipboardCopy, Copy, ClipboardPaste, Download, FileIcon, Folder, FolderOpen, MoreHorizontal, Pencil, Plus, RotateCcw, Terminal as TerminalIcon, Trash, X } from 'lucide-react';
import { useContext, Fragment, useEffect, useRef } from 'react';
import { apiUrl, UserData, UserDataContext } from '../util/UserData';
import { languageMap } from '../util/languageMap';
import { uploadLocalFiles } from '../util/uploadLocalFiles';
import { StatusContext } from '../util/Files';
import { isActiveTerminalBusy } from '../util/terminalActivity';
import { cn } from '../util/cn';

export default function MenuItems({ files, count = 0 }: { files: UserData['files'], count?: number }) {
  const {
    currentFile,
    setCurrentFile,
    openFiles,
    setOpenFiles,
    openFolders,
    setOpenFolders,
    refreshFiles,
    setIsUserEditingName,
    selectedLocation,
    setSelectedLocation,
    dragOverLocation,
    setDragOverLocation,
    setContentVersion,
    contextMenu,
    setContextMenu,
    classroomSymlinks,
    clipboardLocation,
    setClipboardLocation,
  } = useContext(UserDataContext);
  const { setStatus } = useContext(StatusContext);

  // Auto-expand a closed folder after dragging over it for a moment, so
  // users can drag-navigate into nested folders without having to click to
  // expand first. Cleared on drop/leave.
  const expandTimerRef = useRef<{ timer: ReturnType<typeof setTimeout>; location: string } | null>(null);
  const HOVER_EXPAND_MS = 500;
  const cancelExpandTimer = () => {
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current.timer);
      expandTimerRef.current = null;
    }
  };
  const scheduleExpand = (location: string) => {
    if (expandTimerRef.current?.location === location) return;
    cancelExpandTimer();
    expandTimerRef.current = {
      location,
      timer: setTimeout(() => {
        expandTimerRef.current = null;
        setOpenFolders((prev) => (prev.includes(location) ? prev : [...prev, location]));
      }, HOVER_EXPAND_MS),
    };
  };

  const isProtectedLocation = (location?: string) => {
    if (!location) return false;
    const parts = location.split('/').filter(Boolean);
    if (parts.length < 2) return false;
    const second = parts[1];
    if (second !== 'assignments' && second !== '.templates' && second !== 'participants') {
      return false;
    }
    // Instructors can rename/delete inside their own classroom's
    // `assignments/` tree via the IDE. `.templates` is the read-only
    // student-side symlink and `participants/` holds student work, so those
    // stay protected for everyone at the Explorer UI level.
    if (second === 'assignments') {
      const slug = parts[0];
      const classroom = classroomSymlinks?.[slug];
      if (classroom?.isInstructor) return false;
    }
    return true;
  };

  const isArchiveFolder = (location?: string) => {
    if (!location) return false;
    const parts = location.split('/').filter(Boolean);
    return parts[0] === 'archive';
  };

  const isHiddenName = (name: string) => name.startsWith('.');
  const isDimmed = (file: { name: string; location: string }) =>
    isArchiveFolder(file.location) || isHiddenName(file.name);

  const isArchiveRoot = (location?: string) => {
    if (!location) return false;
    return location === '/archive/' || location === '/archive';
  };

  // Auto-hide context menu on any click outside
  useEffect(() => {
    const handler = () => {
      setContextMenu({ ...contextMenu, visible: false });
      document.removeEventListener('click', handler);
    };
    if (!contextMenu.visible) return document.removeEventListener('click', handler);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu, contextMenu.visible, setContextMenu]);

  // Shared classes for the right-click context menu.
  const ctxItem = 'flex items-center gap-2 px-3 py-1.5 text-sm text-ink-default hover:bg-paper-tinted hover:text-ink-strong cursor-pointer w-full text-left transition-colors';
  const ctxItemDestructive = 'flex items-center gap-2 px-3 py-1.5 text-sm text-ink-default hover:bg-paper-tinted hover:text-tomato cursor-pointer w-full text-left transition-colors';
  const ctxItemDisabled = 'flex items-center gap-2 px-3 py-1.5 text-sm text-ink-faint cursor-not-allowed w-full text-left';

  return (
    <div className="flex flex-col gap-0.5">
      {Array.isArray(files) ? (
        files.map((file) => {
          const isFolder = 'files' in file;
          const isSelected = currentFile?.location === file.location || selectedLocation === file.location;
          const isDragOver = dragOverLocation === file.location && isFolder;
          return (
            <Fragment key={file.location}>
              <div
                className={cn(
                  'flex items-center justify-between rounded-sm relative group/row transition-colors',
                  !isSelected && !isDragOver && 'bg-transparent hover:bg-paper-tinted',
                  isSelected && !isDragOver && 'bg-paper-deeper',
                  isDragOver && 'bg-navy-soft ring-1 ring-navy/40',
                )}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedLocation?.(file.location);
                  setContextMenu?.({ visible: true, x: e.clientX, y: e.clientY, targetLocation: file.location });
                }}
                draggable={!file.renaming}
                onDragStart={(e) => {
                  if (file.renaming) return;
                  try { e.dataTransfer.setData('text/x-csroom-source', file.location); } catch { void 0; }
                  try { e.dataTransfer.setData('text/plain', file.location); } catch { void 0; }
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  // Always prevent default so drop can fire; we validate in onDrop
                  e.preventDefault();
                  if (isFolder && !file.renaming) {
                    e.dataTransfer.dropEffect = e.dataTransfer.types.includes('Files') ? 'copy' : 'move';
                  } else {
                    e.dataTransfer.dropEffect = 'none';
                  }
                }}
                onDragEnter={(e) => {
                  if (isFolder && !file.renaming) {
                    e.preventDefault();
                    setDragOverLocation?.(file.location);
                    // Auto-expand closed folders after a short hover.
                    if (!openFolders.includes(file.location)) {
                      scheduleExpand(file.location);
                    }
                  }
                }}
                onDragLeave={(e) => {
                  if (isFolder && !file.renaming) {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverLocation?.(undefined);
                      if (expandTimerRef.current?.location === file.location) {
                        cancelExpandTimer();
                      }
                    }
                  }
                }}
                onDragEnd={() => {
                  setDragOverLocation?.(undefined);
                  cancelExpandTimer();
                }}
                onDrop={async (e) => {
                  if (!isFolder) return; // only drop into folders
                  e.preventDefault();
                  setDragOverLocation?.(undefined);
                  cancelExpandTimer();
                  // Handle OS file drops into this folder
                  if (e.dataTransfer.files.length > 0) {
                    await uploadLocalFiles(e.dataTransfer.files, file.location, apiUrl, setStatus, refreshFiles);
                    setOpenFolders((prev) => prev.includes(file.location) ? prev : [...prev, file.location]);
                    return;
                  }
                  let source = e.dataTransfer.getData('text/x-csroom-source');
                  if (!source) {
                    source = e.dataTransfer.getData('text/plain');
                  }
                  if (!source) return;
                  // Build destination path under this folder
                  const srcName = source.split('/').filter(Boolean).pop() || '';
                  const destBase = file.location.endsWith('/') ? file.location.slice(0, -1) : file.location;
                  const destination = `${destBase}/${srcName}${source.endsWith('/') ? '/' : ''}`;
                  if (destination === source) return;
                  // If the open editor file is the moved item or inside the moved folder, update it pre-refresh
                  if (currentFile?.location) {
                    const currentLoc = currentFile.location;
                    if (currentLoc === source) {
                      setCurrentFile({ name: currentFile.name || srcName, location: destination });
                      setSelectedLocation?.(destination);
                    } else if (source.endsWith('/') && currentLoc.startsWith(source)) {
                      const suffix = currentLoc.slice(source.length);
                      const newLoc = `${destination}${suffix}`;
                      setCurrentFile({ name: currentFile.name, location: newLoc });
                    }
                  }
                  setOpenFiles((prev) => prev.map((f) => {
                    if (f.location === source) return { ...f, name: srcName, location: destination };
                    if (source.endsWith('/') && f.location.startsWith(source)) {
                      return { ...f, location: `${destination}${f.location.slice(source.length)}` };
                    }
                    return f;
                  }));
                  let res = await fetch(`${apiUrl}/files/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ source, destination }),
                  });
                  if (res.status === 409) {
                    // Name conflict: prompt user to replace
                    const name = srcName;
                    const confirmed = window.confirm(`A file or folder named "${name}" already exists here. Replace it? This cannot be undone.`);
                    if (!confirmed) return;
                    res = await fetch(`${apiUrl}/files/move`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ source, destination, overwrite: true }),
                    });
                  }
                  if (res.ok) {
                    setContentVersion?.((v) => (v ?? 0) + 1);
                    await refreshFiles();
                    setOpenFolders((prev) => prev.includes(file.location) ? prev : [...prev, file.location]);
                  } else {
                    const text = await res.text().catch(() => '');
                    console.error('Move failed', res.status, text);
                    try {
                      const errObj = JSON.parse(text);
                      alert(`Move failed: ${errObj.error || text}`);
                    } catch {
                      alert(`Move failed: ${text || res.statusText}`);
                    }
                  }
                }}
                onClick={() => {
                  setSelectedLocation?.(file.location);
                }}
                data-explorer-item
                data-kind={isFolder ? 'folder' : 'file'}
              >
                <button
                  draggable={!file.renaming}
                  onDragStart={(e) => {
                    if (file.renaming) return;
                    try { e.dataTransfer.setData('text/x-csroom-source', file.location); } catch { void 0; }
                    try { e.dataTransfer.setData('text/plain', file.location); } catch { void 0; }
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={() => {
                    if (file.renaming) return; // Prevent opening if renaming
                    if (isFolder) {
                      setOpenFolders((prev) => {
                        if (prev.includes(file.location)) {
                          return prev.filter((f) => f !== file.location);
                        } else {
                          return [...prev, file.location];
                        }
                      });
                    }
                    else {
                      setCurrentFile(file);
                    }
                  }}
                  className={cn(
                    'flex flex-1 items-center gap-1.5 w-full min-w-0 text-left py-1 px-2 bg-transparent border-0 font-sans',
                    'text-[13.5px]',
                    isSelected ? 'font-semibold text-ink-strong' : 'font-normal text-ink-strong',
                    !isFolder && 'cursor-pointer',
                    isFolder && 'cursor-pointer',
                  )}
                  style={{
                    paddingLeft: `${8 + count * 16}px`,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {isFolder ? (
                    <>
                      <span className="inline-flex w-3 text-ink-muted shrink-0">
                        {openFolders.includes(file.location)
                          ? <ChevronDown size={12} />
                          : <ChevronRight size={12} />}
                      </span>
                      {(() => {
                        const FolderIcon = openFolders.includes(file.location) ? FolderOpen : Folder;
                        return (
                          <FolderIcon
                            size={14}
                            className={cn(
                              'shrink-0',
                              isDimmed(file) ? 'text-ink-faint' : 'text-ochre',
                            )}
                          />
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      <span className="inline-block w-3 shrink-0" />
                      {(() => {
                        const Lang = Object.values(languageMap).find(languageMap =>
                          languageMap.extensions.includes(file.name.split('.').pop() || ''),
                        );
                        const IconComp = Lang?.icon ?? FileIcon;
                        return (
                          <IconComp
                            size={13}
                            className={cn(
                              'shrink-0',
                              isDimmed(file) ? 'text-ink-faint' : 'text-ink-muted',
                            )}
                          />
                        );
                      })()}
                    </>
                  )}

                  <span
                    className={cn(
                      'flex-1 truncate min-w-0',
                      isDimmed(file) && 'text-ink-faint',
                    )}
                  >
                    {file.renaming ? (
                      <input
                        type="text"
                        defaultValue={file.name}
                        autoFocus
                        onFocus={(e) => {
                          setIsUserEditingName?.(true);
                          // Highlight entire name for quick editing
                          const input = e.currentTarget;
                          input.setSelectionRange(0, input.value.length);
                        }}
                        onChange={(e) => {
                          // Clear any previous validity error as the user types
                          e.currentTarget.setCustomValidity('');
                        }}
                        onBlur={async (e) => {
                          const input = e.currentTarget;
                          // Guard: React unmounting the input fires a second blur — ignore it
                          if (input.dataset.submitted) return;
                          const name = input.value.trim();

                          // Validate: name must be unique among siblings (case-insensitive)
                          if (name) {
                            const hasDuplicate = files?.some((sibling) => sibling !== file && sibling.name.toLowerCase() === name.toLowerCase());
                            if (hasDuplicate) {
                              input.setCustomValidity('A file or folder with that name already exists.');
                              input.reportValidity();
                              // Keep editing by re-focusing and selecting
                              input.focus();
                              input.setSelectionRange(0, input.value.length);
                              return;
                            }
                          }

                          const isFolderItem = 'files' in file;
                          const originalLocation = file.location;
                          const originalName = file.name;
                          const locNoSlash = originalLocation.endsWith('/') ? originalLocation.slice(0, -1) : originalLocation;
                          const parentPath = locNoSlash.slice(0, locNoSlash.lastIndexOf('/') + 1);
                          const newLocation = `${parentPath}${name || originalName}${isFolderItem ? '/' : ''}`;

                          try {
                            if ((file as any).placeholder) {
                              // Create brand-new file/folder at newLocation
                              input.dataset.submitted = 'true'; // Prevent double-submit on unmount blur
                              const res = await fetch(`${apiUrl}/files/file${newLocation}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                              });
                              if (!res.ok) {
                                delete input.dataset.submitted; // Allow retry
                                let errMsg = 'Unable to create. Try a different name.';
                                try {
                                  const errData = await res.json();
                                  if (errData.error) errMsg = errData.error;
                                } catch { /* use default */ }
                                input.setCustomValidity(errMsg);
                                input.reportValidity();
                                input.focus();
                                input.setSelectionRange(0, input.value.length);
                                return;
                              }
                              // Must clear the editing flag BEFORE refresh.
                              // refreshFiles in root.tsx no-ops while the flag is
                              // set, to protect an in-progress rename input —
                              // but once the POST succeeds we want the tree to
                              // re-fetch so the placeholder/renaming flags clear.
                              setIsUserEditingName?.(false);
                              await refreshFiles(true);
                            } else if (name && name !== originalName) {
                              // Rename existing by moving to new path
                              const moveRes = await fetch(`${apiUrl}/files/move`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ source: originalLocation, destination: newLocation }),
                              });
                              if (!moveRes.ok) {
                                if (moveRes.status === 409) {
                                  input.setCustomValidity('Name already exists.');
                                  input.reportValidity();
                                  input.focus();
                                  input.setSelectionRange(0, input.value.length);
                                  return;
                                }
                                input.setCustomValidity('Unable to rename.');
                                input.reportValidity();
                                input.focus();
                                input.setSelectionRange(0, input.value.length);
                                return;
                              }
                              // Update current selection/editor if needed
                              if (currentFile?.location === originalLocation) {
                                setCurrentFile({ name, location: newLocation });
                                setSelectedLocation?.(newLocation);
                              }
                              setOpenFiles((prev) => prev.map((f) => {
                                if (f.location === originalLocation) return { ...f, name, location: newLocation };
                                if (isFolderItem) {
                                  const folderPrefix = originalLocation.endsWith('/') ? originalLocation : `${originalLocation}/`;
                                  const newPrefix = newLocation.endsWith('/') ? newLocation : `${newLocation}/`;
                                  if (f.location.startsWith(folderPrefix)) {
                                    return { ...f, location: `${newPrefix}${f.location.slice(folderPrefix.length)}` };
                                  }
                                }
                                return f;
                              }));
                              setIsUserEditingName?.(false);
                              await refreshFiles(true);
                            } else {
                              // Unchanged rename on existing item: just refresh to clear renaming flag
                              setIsUserEditingName?.(false);
                              await refreshFiles(true);
                            }
                          } finally {
                            // Guarantee the flag is cleared even on early returns.
                            setIsUserEditingName?.(false);
                          }
                        }}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                          if (e.key === 'Escape') {
                            // Cancel creation
                            await refreshFiles();
                            setIsUserEditingName?.(false);
                          }
                        }}
                        className="bg-paper-elevated border border-rule rounded-sm text-ink-default px-1.5 py-0.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-navy/30 w-full -ml-1"
                      />
                    ) : (
                      file.name
                    )}
                  </span>
                </button>

                {isFolder && (
                  <span className="text-ink-faint text-xs px-1 shrink-0 font-sans">{file.files.length}</span>
                )}
                <button
                  className="cursor-pointer p-0.5 mr-1 rounded text-ink-subtle hover:text-ink-strong hover:bg-paper-tinted transition-colors shrink-0"
                  onClick={async (e) => {
                    if (file.renaming) return await refreshFiles();
                    setSelectedLocation?.(file.location);
                    setContextMenu?.({ visible: true, x: e.clientX, y: e.clientY, targetLocation: file.location });
                  }}
                >
                  {file.renaming ? (
                    <X size={14} />
                  ) : (
                    <MoreHorizontal size={14} />
                  )}
                </button>
              </div>
              {isFolder && (
                <div
                  data-folder-location={file.location}
                  className={cn(
                    'transition-all duration-200 overflow-hidden',
                    !openFolders.includes(file.location) && 'max-h-0 opacity-0 -mt-0.5',
                    openFolders.includes(file.location) && 'max-h-screen opacity-100',
                  )}
                >
                  <MenuItems files={file.files} count={count + 1} />
                </div>
              )}
            </Fragment>
          );
        })
      ) : (
        <div className="text-ink-muted text-sm px-2 py-1">No files found</div>
      )}
      <div
        className={cn(
          'transition-opacity duration-200 fixed bg-paper-elevated border border-rule-soft rounded-md shadow-md py-1.5 min-w-[180px] z-50',
          !contextMenu.visible && 'opacity-0 pointer-events-none',
        )}
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {(() => {
          // Compute the base path for any "New …" action. Folders become the
          // base directly; files resolve to their parent; blank space uses
          // the enclosing folder (or /).
          const newBase = (() => {
            const loc = contextMenu.targetLocation;
            if (!loc) return '/';
            if (contextMenu.blankSpace || loc.endsWith('/')) {
              return loc.endsWith('/') ? loc : `${loc}/`;
            }
            const idx = loc.lastIndexOf('/');
            return idx >= 0 ? loc.slice(0, idx + 1) || '/' : '/';
          })();
          const dispatchNew = (kind: 'file' | 'folder') => {
            window.dispatchEvent(new CustomEvent('csroom:new-at', {
              detail: { kind, base: newBase },
            }));
            setContextMenu({ ...contextMenu, visible: false });
          };
          return (
            <div className="relative group/new">
              <button className={ctxItem}>
                <Plus size={14} className="text-ink-muted" />
                New
                <ChevronRight size={14} className="ml-auto text-ink-subtle" />
              </button>
              <div
                className={cn(
                  'transition-opacity duration-200 absolute left-full top-0 bg-paper-elevated border border-rule-soft rounded-md shadow-md py-1.5 min-w-[160px] z-50',
                  'opacity-0 pointer-events-none',
                  'group-hover/new:opacity-100 group-hover/new:pointer-events-auto',
                )}
              >
                <button
                  className={ctxItem}
                  onClick={() => dispatchNew('file')}
                >
                  <FileIcon size={14} className="text-ink-muted" />
                  File
                </button>
                <button
                  className={ctxItem}
                  onClick={() => dispatchNew('folder')}
                >
                  <Folder size={14} className="text-ochre" />
                  Folder
                </button>
              </div>
            </div>
          );
        })()}
        <div className="my-1 border-t border-rule-soft" />
        {(() => {
          const handlePaste = async () => {
            if (!clipboardLocation || !contextMenu.targetLocation) return;
            const srcName = clipboardLocation.split('/').filter(Boolean).pop() ?? '';
            // Determine destination folder: if target is a folder, paste inside it; otherwise paste next to it
            const targetIsFolder = contextMenu.targetLocation.endsWith('/');
            const destFolder = targetIsFolder
              ? contextMenu.targetLocation
              : contextMenu.targetLocation.split('/').slice(0, -1).join('/') + '/';
            const destination = destFolder + srcName;
            try {
              const res = await fetch(`${apiUrl}/files/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ source: clipboardLocation, destination }),
              });
              if (!res.ok) {
                const text = await res.text();
                alert(text || 'Failed to paste');
              } else {
                await refreshFiles();
              }
            } catch {
              alert('Failed to paste');
            }
            setContextMenu({ ...contextMenu, visible: false });
          };

          const PasteButton = (
            <button
              key="paste"
              className={clipboardLocation ? ctxItem : ctxItemDisabled}
              disabled={!clipboardLocation}
              onClick={handlePaste}
            >
              <ClipboardPaste size={14} className={clipboardLocation ? 'text-ink-muted' : 'text-ink-faint'} />
              Paste{clipboardLocation ? ` "${clipboardLocation.split('/').filter(Boolean).pop()}"` : ''}
            </button>
          );

          // Folder locations in our tree don't carry a trailing "/", so we
          // can't tell folder-vs-file from the string alone — look the item
          // up in the files tree and check for the `files` property.
          const locationIsFolder = (loc: string): boolean => {
            if (loc.endsWith('/')) return true;
            const walk = (items: typeof files): boolean => {
              if (!items) return false;
              for (const it of items) {
                if (it.location === loc) return 'files' in it;
                if ('files' in it) {
                  const found = walk(it.files);
                  if (found) return true;
                }
              }
              return false;
            };
            return walk(files);
          };

          // For blank-space right clicks, treat the implicit target as the
          // enclosing folder (or `/` at the root — which maps to `/app`).
          const isFolder = contextMenu.blankSpace
            || (!!contextMenu.targetLocation && locationIsFolder(contextMenu.targetLocation));
          const targetDir = (() => {
            if (!contextMenu.targetLocation) return null;
            const trimmed = contextMenu.targetLocation.replace(/\/$/, '');
            if (isFolder) return trimmed;
            const parent = trimmed.split('/').slice(0, -1).join('/');
            return parent || '';
          })();
          // Copy path yields a tilde-prefixed path so it pastes into a shell
          // as the user expects (~/foo expands to the container's /app mount).
          const pathForCopy = (() => {
            if (!contextMenu.targetLocation) return null;
            const trimmed = contextMenu.targetLocation.replace(/\/$/, '');
            return trimmed ? `~${trimmed}` : '~';
          })();
          const busy = isActiveTerminalBusy();
          const terminalDisabled = targetDir === null || busy;

          const CopyPathButton = (
            <button
              key="copy-path"
              className={ctxItem}
              onClick={async () => {
                if (pathForCopy === null) return;
                try {
                  await navigator.clipboard.writeText(pathForCopy);
                } catch {
                  window.prompt('Copy path', pathForCopy);
                }
                setContextMenu({ ...contextMenu, visible: false });
              }}
            >
              <ClipboardCopy size={14} className="text-ink-muted" />
              Copy path
            </button>
          );

          const TerminalButton = (
            <button
              key="terminal"
              className={terminalDisabled ? ctxItemDisabled : ctxItem}
              disabled={terminalDisabled}
              title={busy ? 'Terminal is busy running a command' : undefined}
              onClick={() => {
                if (targetDir === null) return;
                // Build a `cd ~` (or `cd ~/'rel/path'`) command. Tilde must
                // sit unquoted at the start of the word for bash to expand
                // it, so we leave it bare and quote the relative path.
                // Escape any single-quote in folder names by closing /
                // escaping / reopening the quote.
                const relPath = targetDir.replace(/^\//, '');
                const escaped = relPath.replace(/'/g, '\'\\\'\'');
                const command = relPath ? `cd ~/'${escaped}'\n` : 'cd ~\n';
                window.dispatchEvent(new CustomEvent('csroom:run-command', {
                  detail: { command },
                }));
                setContextMenu({ ...contextMenu, visible: false });
              }}
            >
              <TerminalIcon size={14} className={terminalDisabled ? 'text-ink-faint' : 'text-ink-muted'} />
              Open in terminal
            </button>
          );

          if (contextMenu.blankSpace) {
            return (
              <>
                {PasteButton}
                {CopyPathButton}
                {TerminalButton}
              </>
            );
          }

          return (
            <>
              <button
                className={ctxItem}
                onClick={() => {
                  if (!contextMenu.targetLocation) return;
                  const a = document.createElement('a');
                  a.href = `${apiUrl}/files/download${contextMenu.targetLocation}`;
                  a.download = '';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                <Download size={14} className="text-ink-muted" />
                Download
              </button>
              <button
                className={ctxItem}
                onClick={() => {
                  if (!contextMenu.targetLocation) return;
                  setClipboardLocation?.(contextMenu.targetLocation);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
              >
                <Copy size={14} className="text-ink-muted" />
                Copy
              </button>
              {PasteButton}
              {CopyPathButton}
              {TerminalButton}
            </>
          );
        })()}
        {(() => {
          // Student-only: right-click an assignment folder (depth 2) or any
          // file inside an assignment (depth 3+) to restore it from the
          // teacher's original version. Instructors never see this.
          const loc = contextMenu.targetLocation;
          if (!loc || contextMenu.blankSpace) return null;
          const parts = loc.split('/').filter(Boolean);
          if (parts.length < 2) return null;
          const slug = parts[0];
          const classroom = classroomSymlinks?.[slug];
          if (!classroom || classroom.isInstructor || classroom.archived) return null;

          const targetIsFolder = (() => {
            if (loc.endsWith('/')) return true;
            const walk = (items: typeof files): boolean => {
              if (!items) return false;
              for (const it of items) {
                if (it.location === loc) return 'files' in it;
                if ('files' in it) {
                  const found = walk(it.files);
                  if (found) return true;
                }
              }
              return false;
            };
            return walk(files);
          })();

          let mode: 'all' | 'file' | null = null;
          let relPath = '';
          const template = parts[1];
          if (parts.length === 2 && targetIsFolder) {
            mode = 'all';
          } else if (parts.length >= 3 && !targetIsFolder) {
            mode = 'file';
            relPath = parts.slice(2).join('/');
          }
          if (!mode) return null;

          const label = mode === 'all'
            ? `Restore all files in "${template}"`
            : `Restore "${relPath.split('/').pop()}"`;
          const confirmMsg = mode === 'all'
            ? `Restore every file in "${template}" from the original version? Your current changes will be overwritten. This cannot be undone.`
            : `Restore "${relPath}" from the original version? Your current changes to this file will be overwritten. This cannot be undone.`;

          return (
            <>
              <div className="my-1 border-t border-rule-soft" />
              <button
                className={ctxItem}
                onClick={async () => {
                  if (!window.confirm(confirmMsg)) return;
                  try {
                    const res = await fetch(
                      `${apiUrl}/classrooms/${classroom.id}/assignments/${encodeURIComponent(template)}/restore`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ paths: mode === 'all' ? null : [relPath] }),
                      },
                    );
                    if (!res.ok) {
                      const body = await res.text().catch(() => '');
                      let reason = body;
                      try {
                        const parsed = JSON.parse(body);
                        reason = parsed.detail ?? parsed.error ?? body;
                      } catch {
                        /* use raw body */
                      }
                      alert(reason || `Restore failed (${res.status})`);
                      return;
                    }
                    setContentVersion?.((v) => (v ?? 0) + 1);
                    await refreshFiles();
                  } catch {
                    alert('Restore failed');
                  }
                  setContextMenu({ ...contextMenu, visible: false });
                }}
              >
                <RotateCcw size={14} className="text-ink-muted" />
                {label}
              </button>
            </>
          );
        })()}
        {!contextMenu.blankSpace && (() => {
          const renameDisabled = (() => {
            if (!contextMenu.targetLocation) return true;
            if (isProtectedLocation(contextMenu.targetLocation)) return true;
            if (isArchiveFolder(contextMenu.targetLocation)) return true;
            const parts = contextMenu.targetLocation.split('/').filter(Boolean);
            const isClassroomRoot = parts.length === 1;
            if (isClassroomRoot) {
              const slug = parts[0];
              const classroom = slug ? classroomSymlinks?.[slug] : undefined;
              if (classroom) {
                return !classroom.isInstructor;
              }
            }
            return false;
          })();
          return (
            <>
              <div className="my-1 border-t border-rule-soft" />
              <button
                className={renameDisabled ? ctxItemDisabled : ctxItem}
                disabled={renameDisabled}
                onClick={() => {
                  if (!contextMenu.targetLocation) return;
                  if (isProtectedLocation(contextMenu.targetLocation)) return;
                  const parts = contextMenu.targetLocation.split('/').filter(Boolean);
                  const isClassroomRoot = parts.length === 1;
                  if (isClassroomRoot) {
                    // Only instructors can rename classrooms
                    const slug = parts[0];
                    const classroom = slug ? classroomSymlinks?.[slug] : undefined;
                    if (classroom?.isInstructor) {
                      window.dispatchEvent(new CustomEvent('csroom:classroom-action', {
                        detail: { location: contextMenu.targetLocation, action: 'rename' },
                      }));
                    }
                  } else {
                    document.dispatchEvent(new CustomEvent('csroom:rename', { detail: { location: contextMenu.targetLocation } }));
                  }
                }}
              >
                <Pencil size={14} className={renameDisabled ? 'text-ink-faint' : 'text-ink-muted'} />
                Rename
              </button>
            </>
          );
        })()}
        {!contextMenu.blankSpace && (() => {
          const deleteDisabled = (() => {
            if (!contextMenu.targetLocation) return true;
            if (isProtectedLocation(contextMenu.targetLocation)) return true;
            if (contextMenu.targetLocation === '/README.md') return true;
            if (isArchiveRoot(contextMenu.targetLocation)) return true;
            if (isArchiveFolder(contextMenu.targetLocation)) {
              const parts = contextMenu.targetLocation.split('/').filter(Boolean);
              if (parts.length !== 2) return true;
              return false;
            }
            return false;
          })();
          const deleteLabel = (() => {
            if (!contextMenu.targetLocation) return 'Delete';
            if (isArchiveFolder(contextMenu.targetLocation)) {
              const parts = contextMenu.targetLocation.split('/').filter(Boolean);
              if (parts.length === 2) {
                return 'Restore';
              }
              return 'Delete';
            }
            const parts = contextMenu.targetLocation.split('/').filter(Boolean);
            const isClassroomRoot = parts.length === 1;
            const slug = parts[0];
            const classroom = slug ? classroomSymlinks?.[slug] : undefined;
            if (isClassroomRoot && classroom) {
              return classroom.archived ? 'Restore' : 'Archive';
            }
            return 'Delete';
          })();
          // Restore is non-destructive; Delete and Archive style as destructive on hover.
          const isDestructive = deleteLabel === 'Delete' || deleteLabel === 'Archive';
          return (
            <button
              className={
                deleteDisabled
                  ? ctxItemDisabled
                  : isDestructive ? ctxItemDestructive : ctxItem
              }
              disabled={deleteDisabled}
              onClick={async () => {
                if (!contextMenu.targetLocation) return;
                if (isProtectedLocation(contextMenu.targetLocation)) return;

                // Handle restore from archive folder
                if (isArchiveFolder(contextMenu.targetLocation)) {
                  const parts = contextMenu.targetLocation.split('/').filter(Boolean);
                  if (parts.length === 2) {
                    const archivedSlug = parts[1];
                    window.dispatchEvent(new CustomEvent('csroom:archive-restore', {
                      detail: { slug: archivedSlug },
                    }));
                  }
                  return;
                }

                const parts = contextMenu.targetLocation.split('/').filter(Boolean);
                const isClassroomRoot = parts.length === 1;
                const slug = parts[0];
                const classroom = slug ? classroomSymlinks?.[slug] : undefined;

                // Handle classroom archive/restore - classroom roots can only be archived, not deleted
                if (isClassroomRoot && classroom) {
                  window.dispatchEvent(new CustomEvent('csroom:classroom-action', {
                    detail: {
                      location: contextMenu.targetLocation,
                      action: classroom.archived ? 'restore' : 'archive',
                    },
                  }));
                  return;
                }

                // Handle regular file/folder deletion (not classroom roots)
                if (!window.confirm(`Delete "${contextMenu.targetLocation}"? This cannot be undone.`)) {
                  return;
                }

                try {
                  const res = await fetch(`${apiUrl}/files/file${contextMenu.targetLocation}`, {
                    method: 'DELETE',
                    credentials: 'include',
                  });

                  if (!res.ok) {
                    const body = await res.text().catch(() => '');
                    let reason = body;
                    try {
                      const parsed = JSON.parse(body);
                      reason = parsed.detail ?? parsed.error ?? body;
                    } catch {
                      // not JSON, use raw body
                    }
                    console.error('Failed to delete:', contextMenu.targetLocation, reason);
                    alert(reason || `Failed to delete "${contextMenu.targetLocation}"`);
                    return;
                  }

                  await refreshFiles();

                  const deletedLoc = contextMenu.targetLocation;
                  const folderPrefix = deletedLoc.endsWith('/') ? deletedLoc : `${deletedLoc}/`;
                  const isMatch = (loc: string) => loc === deletedLoc || loc.startsWith(folderPrefix);
                  const remaining = openFiles.filter((f) => !isMatch(f.location));
                  if (remaining.length !== openFiles.length) setOpenFiles(remaining);
                  if (currentFile?.location && isMatch(currentFile.location)) {
                    setCurrentFile(remaining[remaining.length - 1] ?? undefined);
                  }
                  if (!contextMenu.targetLocation.includes('/', 1)) {
                    setSelectedLocation?.(undefined);
                  }
                } catch (error) {
                  console.error('Error deleting file:', error);
                  alert('Error deleting file');
                }
              }}
            >
              <Trash size={14} className={deleteDisabled ? 'text-ink-faint' : 'text-ink-muted group-hover:text-tomato'} />
              {deleteLabel}
            </button>
          );
        })()}
      </div>
    </div>
  );
}
