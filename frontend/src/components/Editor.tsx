import { useCallback, useContext, useEffect, useState } from "react";
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from "@codemirror/lang-javascript"
import { File } from "lucide-react";
import { FileType, FolderType, UserDataContext } from "../util/UserData";
// @ts-expect-error types not working yet
import { getClasses } from "@luminescent/ui-react"


function findDefaultFile(files: (FolderType | FileType)[]): FileType | undefined {
  console.log("Finding default file in:", files);
  const foundFile = files.find((file) => file.name === "README.md")
    || files.find((file) => file.name.startsWith("index."));
  if (foundFile) console.log("Found default file:", foundFile);
  if (!foundFile) return findDefaultFile(files.flatMap(f => "files" in f ? f.files : []));
  return foundFile;
}

export default function Editor() {
  const [value, setValue] = useState("console.log('hello world!');");
  const onChange = useCallback((val: string) => {
    setValue(val);
  }, []);
  const userData = useContext(UserDataContext);

  useEffect(() => {
    // Find a default file to open
    let currentFile: FileType | undefined;
    console.log(userData.files)
    if (userData.files && userData.files.length > 0) {
      currentFile = findDefaultFile(userData.files);
    }
    if (currentFile) {
      userData.setCurrentFile(currentFile);
    }
  });

  return (
    <div className={getClasses({
      "transition-all flex flex-col rounded-lum border border-lum-border/30 lum-bg-gray-900": true,
      "w-full opacity-100": userData?.currentFile !== undefined,
      "w-0 -ml-2 opacity-0": userData?.currentFile === undefined
    })}>
      <div className="flex items-center gap-2 lum-btn-p-2">
        <File size={16} />
        <span className="text-sm">{userData?.currentFile?.location}</span>
      </div>
      <div className="overflow-auto">
        <CodeMirror value={value} theme="dark" onChange={onChange} className="lum-bg-gray-900 w-full h-full" extensions={[javascript()]} />
      </div>
    </div>
  );
}
