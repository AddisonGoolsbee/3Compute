import { ChevronRight, File, Folder } from "lucide-react";
import { File as FileType, Folder as FolderType } from "../files";

export default function MenuItems({ files }: { files: (FolderType | FileType)[] }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.isArray(files) ? (
        files.map((file, index) => <>
          <div
            key={index}
            className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded-lum cursor-pointer"
          >
            {'files' in file && <ChevronRight size={16} className="text-gray-400" />}
            {'files' in file ? (
              <Folder size={20} />
            ) : (
              <File size={20} className="ml-6" />
            )}
            <span>{file.name}</span>
            {'files' in file && (
              <span className="text-gray-500 text-sm ml-auto">
                {file.files.length} items
              </span>
            )}
          </div>
          {'files' in file && <MenuItems files={file.files} />}
        </>)
      ) : (
        <div className="text-gray-500">No files found</div>
      )}
    </div>
  );
}