import { ChevronRight, FileIcon, FolderIcon, MoreHorizontal } from "lucide-react";
// @ts-expect-error types not working yet
import { getClasses } from "@luminescent/ui-react";
import { useState } from "react";
import React from "react";
import { UserData } from "../util/UserData";

export default function MenuItems({ files }: UserData) {
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  return (
    <div className="flex flex-col gap-1">
      {Array.isArray(files) ? (
        files.map((file, index) => (
          <React.Fragment key={`${file.name}-${index}`}>
            <button
              onClick={() => {
                if ("files" in file) {
                  setOpenFolders((prev) => {
                    if (prev.includes(file.name)) {
                      return prev.filter((f) => f !== file.name);
                    } else {
                      return [...prev, file.name];
                    }
                  });
                }
              }}
              key={`${file.name}-${index}`}
              className={getClasses({
                "lum-btn gap-2 p-1 lum-bg-transparent rounded-lum-1": true,
                "cursor-pointer": !("files" in file),
              })}
            >
              {"files" in file && (
                <ChevronRight
                  size={16}
                  className={getClasses({
                    "text-gray-400": true,
                    "rotate-90": openFolders.includes(file.name),
                  })}
                />
              )}
              {"files" in file ? (
                <FolderIcon size={20} className="text-orange-300" />
              ) : (
                <FileIcon size={20} className="ml-6 text-blue-300" />
              )}
              <span>{file.name}</span>
              <span className="flex items-center gap-1 text-gray-500 text-sm ml-auto">
                {"files" in file && (
                  <>{file.files.length} items</>
                )}
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
                    file.name
                  ),
                  "max-h-screen opacity-100 mt-1": openFolders.includes(
                    file.name
                  ),
                })}
              >
                <MenuItems files={file.files} />
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
