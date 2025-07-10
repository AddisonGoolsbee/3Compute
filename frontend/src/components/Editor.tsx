import { useCallback, useState } from "react";
import CodeMirror from '@uiw/react-codemirror';

export default function Editor() {
  const [value, setValue] = useState("console.log('hello world!');");
  const onChange = useCallback((val: string) => {
    console.log('val:', val);
    setValue(val);
  }, []);

  return (
    <div className="flex flex-col w-full rounded-lum border border-lum-border/30">
      <div className="p-2 bg-gray-800 text-white rounded-t-lum">
        File name here
      </div>
      <div className="overflow-auto rounded-lum">
        <CodeMirror value={value} theme="dark" onChange={onChange} className="lum-bg-gray-900 w-full h-full" />
      </div>
    </div>
  );
}
