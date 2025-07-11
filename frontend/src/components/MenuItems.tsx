import { ChevronRight, FileIcon, FolderIcon } from "lucide-react";
import { File, Folder } from "../main";
// @ts-expect-error types not working yet
import { getClasses } from "@luminescent/ui-react"
import { useState } from "react";

export default function MenuItems({ files }: { files: (Folder | File)[] }) {
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  return (
    <div className="flex flex-col gap-1">
      {Array.isArray(files) ? (
        files.map((file, index) => <>
          <button
            onClick={() => {
              if ('files' in file) {
                setOpenFolders(prev => {
                  if (prev.includes(file.name)) {
                    return prev.filter(f => f !== file.name);
                  } else {
                    return [...prev, file.name];
                  }
                });
              }
            }}
            key={`${file.name}-${index}`}
            className={getClasses({
              "lum-btn gap-2 p-1 lum-bg-transparent rounded-lum-1": true,
              'cursor-pointer': !('files' in file),
            })}
          >
            {'files' in file &&
            <ChevronRight size={16}className={getClasses({
              "text-gray-400": true,
              "rotate-90": openFolders.includes(file.name),
            })}/>}
            {'files' in file ? (
              <FolderIcon size={20} className="text-orange-300" />
            ) : (
              <FileIcon size={20} className="ml-6 text-blue-300" />
            )}
            <span>{file.name}</span>
            {'files' in file && (
              <span className="text-gray-500 text-sm ml-auto">
                {file.files.length} items
              </span>
            )}
          </button>
          {'files' in file && (
            <div className={getClasses({
              'transition-all duration-200 overflow-hidden': true,
              'max-h-0 opacity-0 scale-98': !openFolders.includes(file.name),
              'max-h-screen opacity-100 mt-1': openFolders.includes(file.name),
            })}>
              <MenuItems
                files={file.files}
              />
            </div>
          )}
        </>)
      ) : (
        <div className="text-gray-500">No files found</div>
      )}
    </div>
  );
}