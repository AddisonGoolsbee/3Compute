import { useCallback, useContext, useEffect, useState } from "react";
import CodeMirror from '@uiw/react-codemirror';
import { File, Save } from "lucide-react";
import { backendUrl, FileType, FolderType, UserDataContext } from "../util/UserData";
// @ts-expect-error types not working yet
import { getClasses, SelectMenuRaw } from "@luminescent/ui-react"
import { languageMap } from "../util/CodeMirror";
import { SiMarkdown } from "@icons-pack/react-simple-icons";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { color } from '@uiw/codemirror-extensions-color';
import { hyperLink } from '@uiw/codemirror-extensions-hyper-link';
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import Markdown from 'react-markdown'

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
  const [mdPreview, setMdPreview] = useState<boolean>(true);
  const [currentLanguage, setCurrentLanguage] = useState<keyof typeof languageMap>('javascript');
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
    if (!userData.currentFile) return;
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
    // Set the language based on the file extension
    const ext = userData.currentFile.name.split('.').pop()?.toLowerCase();
    if (!ext) return;
    const lang = Object.keys(languageMap).find(l => languageMap[l as keyof typeof languageMap].extensions.includes(ext)) as keyof typeof languageMap | undefined || 'text';
    setCurrentLanguage(lang);
  }, [userData.currentFile]);

  return (
    <div className={getClasses({
      "relative transition-all flex flex-col rounded-lum max-w-3/4 bg-[#1A1B26] border-lum-border/30 w-full": true,
    })}>
      <div className="flex items-center gap-2 pl-3 p-1 m-1 lum-bg-gray-900 rounded-lum-1">
        <span className="text-sm flex gap-2 items-center flex-1">
          <File size={16} />
          {userData?.currentFile?.location}
          {currentLanguage === "markdown" && (
            <button className={getClasses({
              "lum-btn p-1 rounded-lum-2 gap-1 lum-bg-transparent hover:lum-bg-gray-800": true,
              "text-blue-500": mdPreview,
            })}
              onClick={() => setMdPreview(!mdPreview)}
            >
              <SiMarkdown size={16} />
            </button>
          )}
        </span>
        <div className="flex items-center gap-1">
          <SelectMenuRaw
            id="language-select"
            className="rounded-lum-2 text-xs gap-1 lum-bg-orange-700 hover:lum-bg-orange-600 w-full lum-btn-p-1"
            value={currentLanguage}
            values={Object.values(languageMap).map((Lang) => ({
              name: <div className="flex items-center gap-2">
                <Lang.icon size={16} />
                <span className="font-mono">
                  {Lang.name}
                </span>
              </div>,
              value: Lang.name.toLowerCase(),
            }))}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const languageName = e.target.value as keyof typeof languageMap;
              setCurrentLanguage(languageName);
            }}
            customDropdown
            dropdown={
              <div className="flex items-center gap-2">
                {(() => {
                  const LanguageIcon = languageMap[currentLanguage as keyof typeof languageMap]?.icon;
                  return <LanguageIcon size={16} />;
                })()}
                <span className="font-mono">
                  {languageMap[currentLanguage as keyof typeof languageMap]?.name}
                </span>
              </div>
            }
          />
          <button
            className="lum-btn rounded-lum-2 text-xs gap-1 lum-bg-green-700 hover:lum-bg-green-600 w-full lum-btn-p-1"
            onClick={async () => {
              if (!userData.currentFile) return;
              const response = await fetch(`${backendUrl}/file${userData.currentFile.location}`, {
                method: "PUT",
                body: value,
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
              });
              if (!response.ok) {
                console.error("Failed to save file");
              } else {
                console.log("File saved successfully");
              }
              // Optionally, you can show a notification or update the UI
            }}
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>
      { mdPreview && currentLanguage === "markdown" ? (
        <div className="flex-1 overflow-auto p-4">
          <div className="markdown-preview">
            <Markdown>{value}</Markdown>
          </div>
        </div>
      ) : (
        <div className="overflow-auto">
          <CodeMirror value={value} theme={tokyoNight} onChange={onChange} className="w-full h-full" extensions={[
            languageMap[currentLanguage as keyof typeof languageMap].parser(),
            color, hyperLink, indentationMarkers({  }),
          ]} />
        </div>
      )}
    </div>
  );
}
