import { useCallback, useContext, useEffect, useState } from "react";
import CodeMirror, { Extension } from '@uiw/react-codemirror';
import { File } from "lucide-react";
import { backendUrl, FileType, FolderType, UserDataContext } from "../util/UserData";
// @ts-expect-error types not working yet
import { getClasses, SelectMenuRaw } from "@luminescent/ui-react"
import { languageMap } from "../util/CodeMirror";


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
  const [currentLanguage, setCurrentLanguage] = useState<{
    name: string;
    parser: () => Extension;
    extensions: string[];
  }>(languageMap.javascript);
  const onChange = useCallback((val: string) => {
    setValue(val);
  }, []);
  const userData = useContext(UserDataContext);

  useEffect(() => {
    if (userData.currentFile) return;
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

  useEffect(() => {
    if (userData.currentFile) {
      // Load the content of the current file
      fetch(`${backendUrl}/file${userData.currentFile.location}`, {
        credentials: "include",
      })
        .then(response => {
          if (!response.ok) throw new Error("Failed to load file");
          return response.text();
      })
        .then(text => setValue(text))
        .catch(err => console.error("Error loading file:", err));
    }
  }, [userData.currentFile]);

  return (
    <div className={getClasses({
      "transition-all flex flex-col rounded-lum max-w-3/4 lum-bg-gray-900/50": true,
      "w-full opacity-100": userData?.currentFile !== undefined,
      "w-0 -ml-2 opacity-0": userData?.currentFile === undefined
    })}>
      <div className="flex items-center gap-2 pl-3 p-1 m-1 lum-bg-gray-900 rounded-lum-1">
        <File size={16} />
        <span className="text-sm flex-1">
          {userData?.currentFile?.location}
        </span>
        <div>
          <SelectMenuRaw
            id="language-select"
            className="rounded-lum-2 text-xs gap-1 lum-bg-orange-700 hover:lum-bg-orange-800 w-full lum-btn-p-1"
            value={currentLanguage.name}
            values={Object.values(languageMap).map((lang) => ({
              name: lang.name,
              value: lang.name.toLowerCase(),
            }))}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const languageName = e.target.value as keyof typeof languageMap;
              setCurrentLanguage(languageMap[languageName]);
            }}
          />
        </div>
      </div>
      <div className="overflow-auto">
        <CodeMirror value={value} theme="dark" onChange={onChange} className="w-full h-full" extensions={[currentLanguage.parser()]} />
      </div>
    </div>
  );
}
