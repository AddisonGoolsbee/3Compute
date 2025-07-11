import { UserInfo } from "./root";
import { FolderIcon } from "lucide-react";
import MenuItems from "./components/MenuItems";
import UploadButton from "./components/UploadButton";
import TemplateButton from "./components/TemplateButton";
import Editor from "./components/Editor";
import { File, Folder } from "./main";

export default function Layout({ children, userInfo, files }: { children?: React.ReactNode, userInfo?: UserInfo, files?: (Folder | File)[] }) {
  return <>
    <div className="h-[calc(100svh-6rem)] flex flex-col gap-1 items-center justify-center max-w-6xl mx-auto">
      <div className="flex flex-1 h-10 w-full gap-1">
        <div className="flex flex-col w-1/4 lum-card gap-1 p-1 lum-bg-gray-950 border-lum-border/30">
          <div className="flex flex-col items-center gap-3 py-2 bg-gray-900 rounded-lum-1 border-b border-b-lum-border/10"  >
            <div className="flex w-full items-center px-4 gap-3 text-lg font-semibold">
              <FolderIcon size={26} />
              Files
            </div>
            { userInfo && (
              <div className="flex gap-1">
                <UploadButton />
                <TemplateButton userInfo={userInfo} />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {Array.isArray(files) ? (
              <MenuItems files={files} />
            ) : (
              userInfo ?
              <div className="text-red-500">Error loading files</div>
              : <MenuItems files={[{
                name: "index.py",
              }]} />
            )}
          </div>
        </div>
        <Editor />
      </div>
      <div className="w-full">
        {userInfo && children ? children : (
          <div className="lum-card lum-bg-black border-lum-border/40 h-104 p-4"/>
        )}
      </div>
        <div className="text-sm text-lum-text-secondary mt-2">
          {userInfo ? (
            <span>Your available port range: {userInfo.port_start}-{userInfo.port_end}</span>
          ) : (
            <span>This goes so hard</span>
          )}
        </div>
    </div>
  </>;
}
