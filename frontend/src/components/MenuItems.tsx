import { ChevronRight, FileIcon, FolderIcon } from "lucide-react";
import { File, Folder } from "../main";
// @ts-expect-error types not working yet
import { getClasses } from "@luminescent/ui-react"
import React from "react";

export default function MenuItems({ files }: { files: (Folder | File)[] }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.isArray(files) ? (
        files.map((file, idx) => (
          <React.Fragment key={file.name + "-" + idx}>
            <div
              className={getClasses({
                "lum-btn gap-2 p-1 lum-bg-transparent rounded-lum-1": true,
                "cursor-pointer": !("files" in file),
              })}
            >
              {"files" in file && (
                <ChevronRight size={16} className="text-gray-400" />
              )}
              {"files" in file ? (
                <FolderIcon size={20} className="text-orange-300" />
              ) : (
                <FileIcon size={20} className="ml-6 text-blue-300" />
              )}
              <span>{file.name}</span>
              {"files" in file && (
                <span className="text-gray-500 text-sm ml-auto">
                  {file.files.length} items
                </span>
              )}
            </div>
            {"files" in file && <MenuItems files={file.files} />}
          </React.Fragment>
        ))
      ) : (
        <div className="text-gray-500">No files found</div>
      )}
    </div>
  );
}