import { useCallback, useState } from "react";
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from "@codemirror/lang-javascript"
import { File } from "lucide-react";

export default function Editor() {
  const [value, setValue] = useState("console.log('hello world!');");
  const onChange = useCallback((val: string) => {
    console.log('val:', val);
    setValue(val);
  }, []);

  return (
    <div className="flex flex-col w-full rounded-lum border border-lum-border/30 lum-bg-gray-900">
      <div className="flex items-center gap-2 lum-btn-p-2">
        <File size={16} />
        / app / index.py
      </div>
      <div className="overflow-auto">
        <CodeMirror value={value} theme="dark" onChange={onChange} className="lum-bg-gray-900 w-full h-full" extensions={[javascript()]} />
      </div>
    </div>
  );
}
