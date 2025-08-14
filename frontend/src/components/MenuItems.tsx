import { FileIcon, FolderClosed, FolderOpen, MoreHorizontal, Pencil, Trash, X } from 'lucide-react';
import { getClasses } from '@luminescent/ui-react';
import { useContext, Fragment, useEffect } from 'react';
import { backendUrl, UserData, UserDataContext } from '../util/UserData';
import { languageMap } from '../util/languageMap';

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
  } = useContext(UserDataContext);

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
                'lum-bg-transparent hover:lum-bg-gray-950':
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
                  e.dataTransfer.dropEffect = 'move';
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
                let res = await fetch(`${backendUrl}/move`, {
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
                  res = await fetch(`${backendUrl}/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ source, destination, overwrite: true }),
                  });
                }
                if (res.ok) {
                  // Bump content version to ensure editor fetches fresh content if the open file was replaced
                  setContentVersion?.((v) => (v ?? 0) + 1);
                  await refreshFiles();
                  setOpenFolders((prev) => prev.includes(file.location) ? prev : [...prev, file.location]);
                } else {
                  const text = await res.text().catch(() => '');
                  console.error('Move failed', res.status, text);
                }
              }}
              onClick={() => {
                setSelectedLocation?.(file.location);
              }}
              data-explorer-item
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
                  'flex flex-1 lum-btn-p-1 rounded-lum-1 rounded-r-none items-center gap-2 w-full text-left lum-bg-transparent': true,
                  'cursor-pointer': !('files' in file),
                  'ring-1 ring-blue-400/40': dragOverLocation === file.location && 'files' in file,
                })}
                style={{ paddingLeft: `calc(0.5rem + ${count * 0.5}rem)` }}
              >
                {'files' in file
                  ? (
                    openFolders.includes(file.location)
                      ? <FolderOpen size={16} className="text-orange-400 min-w-4" />
                      : <FolderClosed size={16} className="text-orange-300 min-w-4" />
                  ) : (() => {
                    const Lang = Object.values(languageMap).find(languageMap =>
                      languageMap.extensions.includes(file.name.split('.').pop() || ''),
                    );
                    if (Lang) return <Lang.icon size={16} className="text-blue-300 min-w-4" />;
                    return <FileIcon size={16} className="text-blue-300 min-w-4" />;
                  })()}

                <span className="flex-1">
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
                            if (!name) {
                              // Empty or unchanged name on placeholder: keep default
                              // newLocation already accounts for default name
                            }
                            const res = await fetch(`${backendUrl}/file${newLocation}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                            });
                            if (!res.ok) {
                              input.setCustomValidity('Unable to create. Try a different name.');
                              input.reportValidity();
                              input.focus();
                              input.setSelectionRange(0, input.value.length);
                              return;
                            }
                            await refreshFiles();
                          } else if (name && name !== originalName) {
                            // Rename existing by moving to new path
                            const moveRes = await fetch(`${backendUrl}/move`, {
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
                            await refreshFiles();
                          } else {
                            // Unchanged rename on existing item: just refresh to clear renaming flag
                            await refreshFiles();
                          }
                        } finally {
                          // End editing state so auto-refresh resumes
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
          'transition-opacity duration-300 fixed lum-card p-1 gap-1 z-50 drop-shadow-xl drop-shadow-black lum-bg-gray-900/50 backdrop-blur-lg': true,
          'opacity-0 pointer-events-none': !contextMenu.visible,
        })}
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
          onClick={() => {
            // Ensure only one item is renaming: clear any existing placeholders/renaming
            document.dispatchEvent(new CustomEvent('3compute:rename', { detail: { location: contextMenu.targetLocation } }));
          }}
        >
          <Pencil size={16} className="inline mr-2" />
          Rename
        </button>
        <button
          className="lum-btn lum-btn-p-1 rounded-lum-1 gap-0.5 w-full text-left lum-bg-transparent"
          onClick={async () => {
            const response = await fetch(`${backendUrl}/file${contextMenu.targetLocation}`, {
              method: 'DELETE',
              credentials: 'include',
            });
            if (response.ok) {
              setCurrentFile(undefined);
              setOpenFolders((prev) => prev.filter((f) => f !== contextMenu.targetLocation));
              await refreshFiles();
            } else {
              console.error('Failed to delete file:', response.statusText);
            }
          }}
        >
          <Trash size={16} className="inline mr-2" />
          Delete
        </button>
      </div>
    </div>
  );
}
