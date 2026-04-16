import { ChevronRight, ClipboardCopy, Copy, ClipboardPaste, Download, FileIcon, Folder, FolderClosed, FolderOpen, LayoutTemplate, MoreHorizontal, Pencil, Plus, Terminal as TerminalIcon, Trash, X } from 'lucide-react';
import { getClasses } from '@luminescent/ui-react';
import { useContext, Fragment, useEffect } from 'react';
import { apiUrl, UserData, UserDataContext } from '../util/UserData';
import { languageMap } from '../util/languageMap';
import { uploadLocalFiles } from '../util/uploadLocalFiles';
import { StatusContext } from '../util/Files';
import { isActiveTerminalBusy } from '../util/terminalActivity';

export default function MenuItems({ files, count = 0 }: { files: UserData['files'], count?: number }) {
  const {
    currentFile,
    setCurrentFile,
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

  return (
    <div className="flex flex-col gap-1">
      {Array.isArray(files) ? (
        files.map((file) => (
          <Fragment key={file.location}>
            <div
              className={getClasses({
                'lum-btn': !file.renaming,
                'flex items-center justify-between': file.renaming,
                'p-0 gap-0 rounded-lum-1': true,
                'lum-bg-gray-900 hover:lum-bg-gray-800':
                  currentFile?.location === file.location || selectedLocation === file.location,
                'lum-bg-transparent hover:lum-bg-gray-900/50':
                  currentFile?.location !== file.location && selectedLocation !== file.location,
              })}
              onContextMenu={(e) => {
                e.preventDefault();
                setSelectedLocation?.(file.location);
                setContextMenu?.({ visible: true, x: e.clientX, y: e.clientY, targetLocation: file.location });
              }}
              draggable={!file.renaming}
              onDragStart={(e) => {
                if (file.renaming) return;
                try { e.dataTransfer.setData('text/x-3compute-source', file.location); } catch { void 0; }
                try { e.dataTransfer.setData('text/plain', file.location); } catch { void 0; }
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                // Always prevent default so drop can fire; we validate in onDrop
                e.preventDefault();
                if ('files' in file && !file.renaming) {
                  e.dataTransfer.dropEffect = e.dataTransfer.types.includes('Files') ? 'copy' : 'move';
                } else {
                  e.dataTransfer.dropEffect = 'none';
                }
              }}
              onDragEnter={(e) => {
                if ('files' in file && !file.renaming) {
                  e.preventDefault();
                  setDragOverLocation?.(file.location);
                }
              }}
              onDragLeave={(e) => {
                if ('files' in file && !file.renaming) {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverLocation?.(undefined);
                  }
                }
              }}
              onDragEnd={() => {
                setDragOverLocation?.(undefined);
              }}
              onDrop={async (e) => {
                if (!('files' in file)) return; // only drop into folders
                e.preventDefault();
                setDragOverLocation?.(undefined);
                // Handle OS file drops into this folder
                if (e.dataTransfer.files.length > 0) {
                  await uploadLocalFiles(e.dataTransfer.files, file.location, apiUrl, setStatus, refreshFiles);
                  setOpenFolders((prev) => prev.includes(file.location) ? prev : [...prev, file.location]);
                  return;
                }
                let source = e.dataTransfer.getData('text/x-3compute-source');
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
              data-kind={'files' in file ? 'folder' : 'file'}
            >
              <button
                draggable={!file.renaming}
                onDragStart={(e) => {
                  if (file.renaming) return;
                  try { e.dataTransfer.setData('text/x-3compute-source', file.location); } catch { void 0; }
                  try { e.dataTransfer.setData('text/plain', file.location); } catch { void 0; }
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => {
                  if (file.renaming) return; // Prevent opening if renaming
                  if ('files' in file) {
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
                className={getClasses({
                  'flex flex-1 lum-btn-p-1 rounded-lum-1 rounded-r-none items-center gap-2 w-full min-w-0 text-left lum-bg-transparent': true,
                  'cursor-pointer': !('files' in file),
                  'ring-1 ring-blue-400/40': dragOverLocation === file.location && 'files' in file,
                })}
                style={{
                  paddingLeft: `calc(0.5rem + ${count * 0.5}rem)`,
                  boxShadow: 'none',
                  // Luminescent's lum-bg-* utility paints a blue border on
                  // :focus; pin it transparent here so mouse clicks don't
                  // leave a persistent blue box around the row.
                  borderColor: 'transparent',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {'files' in file
                  ? (
                    openFolders.includes(file.location)
                      ? <FolderOpen size={16} className={isDimmed(file) ? 'text-gray-500 min-w-4' : 'text-orange-400 min-w-4'} />
                      : <FolderClosed size={16} className={isDimmed(file) ? 'text-gray-500 min-w-4' : 'text-orange-300 min-w-4'} />
                  ) : (() => {
                    const Lang = Object.values(languageMap).find(languageMap =>
                      languageMap.extensions.includes(file.name.split('.').pop() || ''),
                    );
                    if (Lang) return <Lang.icon size={16} className={isDimmed(file) ? 'text-gray-500 min-w-4' : 'text-blue-300 min-w-4'} />;
                    return <FileIcon size={16} className={isDimmed(file) ? 'text-gray-500 min-w-4' : 'text-blue-300 min-w-4'} />;
                  })()}

                <span className={getClasses({
                  'flex-1 truncate min-w-0': true,
                  'text-gray-500': isDimmed(file),
                })}>
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

                        const isFolder = 'files' in file;
                        const originalLocation = file.location;
                        const originalName = file.name;
                        const locNoSlash = originalLocation.endsWith('/') ? originalLocation.slice(0, -1) : originalLocation;
                        const parentPath = locNoSlash.slice(0, locNoSlash.lastIndexOf('/') + 1);
                        const newLocation = `${parentPath}${name || originalName}${isFolder ? '/' : ''}`;

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
                      className="lum-input py-0 px-1 rounded-lum-2 w-full -ml-1 lum-bg-gray-900"
                    />
                  ) : (
                    file.name
                  )}
                </span>
              </button>

              {'files' in file && (
                <p className="text-gray-500! text-sm">{file.files.length}</p>
              )}
              <button className="lum-btn cursor-pointer rounded-lum-1 rounded-l-none p-2 items-center gap-1 text-gray-500 text-sm hover:text-gray-300 lum-bg-transparent hover:lum-bg-transparent"
                onClick={async (e) => {
                  if (file.renaming) return await refreshFiles();
                  console.log('h');
                  setSelectedLocation?.(file.location);
                  setContextMenu?.({ visible: true, x: e.clientX, y: e.clientY, targetLocation: file.location });
                }}
              >
                {file.renaming ? (
                  <X size={16} />
                ) : (
                  <MoreHorizontal size={16} />
                )}
              </button>
            </div>
            {'files' in file && (
              <div
                data-folder-location={file.location}
                className={getClasses({
                  'transition-all duration-200 overflow-hidden': true,
                  'max-h-0 opacity-0 scale-98 -mt-1': !openFolders.includes(
                    file.location,
                  ),
                  'max-h-screen opacity-100': openFolders.includes(
                    file.location,
                  ),
                })}
              >
                <MenuItems files={file.files} count={count + 1} />
              </div>
            )}
          </Fragment>
        ))
      ) : (
        <div className="text-gray-500">No files found</div>
      )}
      <div
        className={getClasses({
          'transition-opacity duration-300 fixed lum-card p-1 gap-1 z-50 drop-shadow-xl lum-bg-gray-900 border border-gray-700/60': true,
          'opacity-0 pointer-events-none': !contextMenu.visible,
        })}
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
          const dispatchNew = (kind: 'file' | 'folder' | 'template') => {
            window.dispatchEvent(new CustomEvent('3compute:new-at', {
              detail: { kind, base: newBase },
            }));
            setContextMenu({ ...contextMenu, visible: false });
          };
          return (
            <div className="relative group/new">
              <button className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent">
                <Plus size={16} className="inline mr-2" />
                New
                <ChevronRight size={14} className="ml-auto opacity-70" />
              </button>
              {/* Mirror the parent context menu's exact class list, including
                  the opacity-based visibility transition, so Luminescent's
                  `lum-card` / `lum-bg-*` utilities render the surface the
                  same way. Using opacity (not display) also means both
                  surfaces stack identically — avoiding the subtle
                  transparency mismatch that appears when one is rendered
                  via `hidden`/`flex` and the other via `opacity`. */}
              <div
                className={getClasses({
                  'transition-opacity duration-300 absolute left-full top-0 lum-card p-1 gap-1 z-50 drop-shadow-xl lum-bg-gray-900 border border-gray-700/60 min-w-[10rem]': true,
                  'opacity-0 pointer-events-none': true,
                  'group-hover/new:opacity-100 group-hover/new:pointer-events-auto': true,
                })}
              >
                <button
                  className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
                  onClick={() => dispatchNew('file')}
                >
                  <FileIcon size={16} className="inline mr-2" />
                  File
                </button>
                <button
                  className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
                  onClick={() => dispatchNew('folder')}
                >
                  <Folder size={16} className="inline mr-2" />
                  Folder
                </button>
                <button
                  className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
                  onClick={() => dispatchNew('template')}
                >
                  <LayoutTemplate size={16} className="inline mr-2" />
                  Template
                </button>
              </div>
            </div>
          );
        })()}
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
              className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
              disabled={!clipboardLocation}
              onClick={handlePaste}
            >
              <ClipboardPaste size={16} className="inline mr-2" />
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
          // Copy path yields the container-absolute path. Terminal shells
          // and scripts expect paths rooted at /app (the user's uploads
          // mount), so we prepend that here.
          const pathForCopy = (() => {
            if (!contextMenu.targetLocation) return null;
            const trimmed = contextMenu.targetLocation.replace(/\/$/, '');
            return trimmed ? `/app${trimmed}` : '/app';
          })();
          const busy = isActiveTerminalBusy();
          const terminalDisabled = targetDir === null || busy;

          const CopyPathButton = (
            <button
              key="copy-path"
              className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
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
              <ClipboardCopy size={16} className="inline mr-2" />
              Copy path
            </button>
          );

          const TerminalButton = (
            <button
              key="terminal"
              className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
              disabled={terminalDisabled}
              title={busy ? 'Terminal is busy running a command' : undefined}
              onClick={() => {
                if (targetDir === null) return;
                // Path inside the container is rooted at /app (the user's
                // uploads mount). Escape any single-quote in a folder name
                // by closing/escaping/reopening the quote.
                const containerPath = `/app${targetDir}`.replace(/'/g, '\'\\\'\'');
                window.dispatchEvent(new CustomEvent('3compute:run-command', {
                  detail: { command: `cd '${containerPath}'\n` },
                }));
                setContextMenu({ ...contextMenu, visible: false });
              }}
            >
              <TerminalIcon size={16} className="inline mr-2" />
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
                className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
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
                <Download size={16} className="inline mr-2" />
                Download
              </button>
              <button
                className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
                onClick={() => {
                  if (!contextMenu.targetLocation) return;
                  setClipboardLocation?.(contextMenu.targetLocation);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
              >
                <Copy size={16} className="inline mr-2" />
                Copy
              </button>
              {PasteButton}
              {CopyPathButton}
              {TerminalButton}
            </>
          );
        })()}
        {!contextMenu.blankSpace && (
          <button
            className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
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
                  window.dispatchEvent(new CustomEvent('3compute:classroom-action', {
                    detail: { location: contextMenu.targetLocation, action: 'rename' },
                  }));
                }
              } else {
                document.dispatchEvent(new CustomEvent('3compute:rename', { detail: { location: contextMenu.targetLocation } }));
              }
            }}
            disabled={(() => {
              if (!contextMenu.targetLocation) return true;
              if (isProtectedLocation(contextMenu.targetLocation)) return true;
              // Archive folder and its contents cannot be renamed
              if (isArchiveFolder(contextMenu.targetLocation)) return true;
              const parts = contextMenu.targetLocation.split('/').filter(Boolean);
              const isClassroomRoot = parts.length === 1;
              if (isClassroomRoot) {
                const slug = parts[0];
                const classroom = slug ? classroomSymlinks?.[slug] : undefined;
                // Only instructors can rename classrooms; normal folders can be renamed
                if (classroom) {
                  return !classroom.isInstructor;
                }
              }
              return false;
            })()}
          >
            <Pencil size={16} className="inline mr-2" />
            Rename
          </button>
        )}
        {!contextMenu.blankSpace && (
          <button
            className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
            onClick={async () => {
              if (!contextMenu.targetLocation) return;
              if (isProtectedLocation(contextMenu.targetLocation)) return;

              // Handle restore from archive folder
              if (isArchiveFolder(contextMenu.targetLocation)) {
                const parts = contextMenu.targetLocation.split('/').filter(Boolean);
                if (parts.length === 2) {
                  const archivedSlug = parts[1];
                  window.dispatchEvent(new CustomEvent('3compute:archive-restore', {
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
                window.dispatchEvent(new CustomEvent('3compute:classroom-action', {
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

                if (currentFile?.location === contextMenu.targetLocation) {
                  setCurrentFile(undefined);
                }
                if (!contextMenu.targetLocation.includes('/', 1)) {
                  setSelectedLocation?.(undefined);
                }
              } catch (error) {
                console.error('Error deleting file:', error);
                alert('Error deleting file');
              }
            }}
            disabled={(() => {
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
            })()}
          >
            <Trash size={16} className="inline mr-2" />
            {(() => {
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
            })()}
          </button>
        )}
      </div>
    </div>
  );
}
