import { ChevronRight, FileIcon, FolderIcon, MoreHorizontal } from "lucide-react";
// @ts-expect-error types not working yet
import { getClasses } from "@luminescent/ui-react";
import React from "react";
import { UserData, UserDataContext } from "../util/UserData";
import { languageMap } from "../util/CodeMirror";

export default function MenuItems({ files, count = 0 }: { files: UserData['files'], count?: number }) {
  const {
    setCurrentFile,
    openFolders,
    setOpenFolders,
  } = React.useContext(UserDataContext);

  return (
    <div className="flex flex-col gap-1">
      {Array.isArray(files) ? (
        files.map((file) => (
          <React.Fragment key={file.location}>
            <button
              onClick={() => {
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
                "lum-btn gap-2 p-1 lum-bg-transparent rounded-lum-1": true,
                "cursor-pointer": !("files" in file),
              })}
              style={{ paddingLeft: "calc(0.25rem + 0.5rem * " + count + ")"}}
            >
              {"files" in file && (
                <ChevronRight
                  size={16}
                  className={getClasses({
                    "transition-all text-gray-400": true,
                    "rotate-90": openFolders.includes(file.location),
                  })}
                />
              )}
              {"files" in file ? <div className="relative">
                <FolderIcon size={24} className="text-orange-300" />
                <span className="text-orange-100 text-[10px] absolute bottom-1 left-2.25">{file.files.length}</span>
              </div> : (() => {
                const Lang = Object.values(languageMap).find(languageMap =>
                  languageMap.extensions.includes(file.name.split('.').pop() || "")
                );
                if (Lang) return <Lang.icon size={16} className="text-blue-300 ml-6" />
                return <FileIcon size={16} className="text-blue-300 ml-6" />;
              })()}
              <span>{file.name}</span>
              <span className="flex items-center gap-1 text-gray-500 text-sm ml-auto">
                <div className="lum-btn p-0 lum-bg-transparent hover:text-lum-text">
                  <MoreHorizontal size={16} />
                </div>
              </span>
            </button>
            {"files" in file && (
              <div
                className={getClasses({
                  "transition-all duration-200 overflow-hidden": true,
                  "max-h-0 opacity-0 scale-98": !openFolders.includes(
                    file.location
                  ),
                  "max-h-screen opacity-100 mt-1": openFolders.includes(
                    file.location
                  ),
                })}
              >
                <MenuItems files={file.files} count={count + 1} />
              </div>
            )}
          </React.Fragment>
        ))
      ) : (
        <div className="text-gray-500">No files found</div>
      )}
    </div>
  );
}
