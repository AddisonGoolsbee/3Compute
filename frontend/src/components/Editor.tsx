import { useCallback, useContext, useState } from "react";
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from "@codemirror/lang-javascript"
import { File } from "lucide-react";
import { UserDataContext } from "../util/UserData";
// @ts-expect-error types not working yet
import { getClasses } from "@luminescent/ui-react"


export default function Editor() {
  const [value, setValue] = useState("console.log('hello world!');");
  const onChange = useCallback((val: string) => {
    setValue(val);
  }, []);
  const userData = useContext(UserDataContext);

  return (
    <div className={getClasses({
      "transition-all flex flex-col rounded-lum border border-lum-border/30 lum-bg-gray-900": true,
      "w-full opacity-100": userData?.currentFile !== undefined,
      "w-0": userData?.currentFile === undefined
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
