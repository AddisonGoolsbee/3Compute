import { FileIcon, FolderClosed, FolderOpen, Trash, X } from "lucide-react";
// @ts-expect-error types not working yet
import { getClasses } from "@luminescent/ui-react";
import { useContext, Fragment } from "react";
import { backendUrl, UserData, UserDataContext } from "../util/UserData";
import { languageMap } from "../util/languageMap";

export default function MenuItems({ files, count = 0 }: { files: UserData['files'], count?: number }) {
  const {
    currentFile,
    setCurrentFile,
    openFolders,
    setOpenFolders,
    refreshFiles,
  } = useContext(UserDataContext);

  return (
    <div className="flex flex-col gap-1">
      {Array.isArray(files) ? (
        files.map((file) => (
          <Fragment key={file.location}>
            <div className={getClasses({
              "lum-btn": !file.renaming,
              "flex items-center justify-between": file.renaming,
              "p-0 gap-0 lum-bg-transparent rounded-lum-1": true,
              "bg-gray-900/30 border-lum-border/10": currentFile?.location === file.location
            })}>
              <button
                onClick={() => {
                  if (file.renaming) return; // Prevent opening if renaming
                  if ("files" in file) {
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
                  "flex flex-1 lum-btn-p-1 rounded-lum-1 rounded-r-none items-center gap-2 w-full text-left lum-bg-transparent": true,
                  "cursor-pointer": !("files" in file),
                })}
                style={{ paddingLeft: `calc(0.5rem + ${count * 0.5}rem)` }}
              >
                {"files" in file
                ? (
                  openFolders.includes(file.location)
                    ? <FolderOpen size={16} className="text-orange-400 min-w-4" />
                    : <FolderClosed size={16} className="text-orange-300 min-w-4" />
                ) : (() => {
                  const Lang = Object.values(languageMap).find(languageMap =>
                    languageMap.extensions.includes(file.name.split('.').pop() || "")
                  );
                  if (Lang) return <Lang.icon size={16} className="text-blue-300 min-w-4" />
                  return <FileIcon size={16} className="text-blue-300 min-w-4" />;
                })()}

                <span className="flex-1">
                  {file.renaming ? (
                    <input
                      type="text"
                      defaultValue={file.name}
                      onBlur={async (e) => {
                        refreshFiles();
                        const newName = e.target.value.trim();
                        if (newName && newName !== file.name) {
                          const res = await fetch(`${backendUrl}/files/${file.location}`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            credentials: "include",
                            body: JSON.stringify({
                              newName,
                            }),
                          });
                          if (res.ok) {
                            await refreshFiles();
                          }
                        }
                      }}
                      className="lum-input py-0 px-1 rounded-lum-2 w-full -ml-1 lum-bg-gray-900"
                    />
                  ) : (
                    file.name
                  )}
                </span>
              </button>

              {"files" in file && (
                <p className="text-gray-500! text-sm">{file.files.length}</p>
              )}
              <button className="lum-btn cursor-pointer rounded-lum-1 rounded-l-none p-1 items-center gap-1 text-gray-500 text-sm hover:text-gray-300 lum-bg-transparent hover:lum-bg-transparent"
                onClick={async () => {
                  if (file.renaming) return await refreshFiles();
                  const response = await fetch(`${backendUrl}/file${file.location}`, {
                    method: "DELETE",
                    credentials: "include",
                  });
                  if (response.ok) {
                    setCurrentFile(undefined);
                    setOpenFolders((prev) => prev.filter((f) => f !== file.location));
                    await refreshFiles();
                  } else {
                    console.error("Failed to delete file:", response.statusText);
                  }
                }}
              >
                {file.renaming ? (
                  <X size={16} />
                ) : (
                  <Trash size={16} />
                )}
              </button>
            </div>
            {"files" in file && (
              <div
                className={getClasses({
                  "transition-all duration-200 overflow-hidden": true,
                  "max-h-0 opacity-0 scale-98 -mt-1": !openFolders.includes(
                    file.location
                  ),
                  "max-h-screen opacity-100": openFolders.includes(
                    file.location
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
    </div>
  );
}
