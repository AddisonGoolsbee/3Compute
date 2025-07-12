import { FolderIcon } from "lucide-react";
import MenuItems from "./components/MenuItems";
import UploadButton from "./components/UploadButton";
import TemplateButton from "./components/TemplateButton";
import Editor from "./components/Editor";
import { useContext } from "react";
import { UserDataContext } from "./util/UserData";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const userData = useContext(UserDataContext);

  return <>
    <div className="h-[calc(100svh-6rem)] flex flex-col gap-1 items-center justify-center max-w-6xl mx-auto">
      <div className="flex flex-1 h-10 w-full gap-1">
        <div className="flex flex-col w-1/4 lum-card gap-1 p-1 lum-bg-gray-950 border-lum-border/30">
          <div className="flex items-center gap-2 p-1 pl-2 bg-gray-900 rounded-lum-1 border-b border-b-lum-border/10"  >
            <FolderIcon size={20} />
            <span className="flex-1">
              Files
            </span>
            <div>
              <UploadButton />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {Array.isArray(userData?.files) ? (
              <MenuItems files={userData?.files} />
            ) : (
              userData?.userInfo ?
              <div className="text-red-500">Error loading files</div>
              : <MenuItems files={[{
                name: "index.py",
                location: "/index.py"
              }]} />
            )}
          </div>
          {userData?.userInfo &&
            <div className="flex flex-col">
              <TemplateButton userInfo={userData?.userInfo} />
            </div>
          }
        </div>
        <Editor />
      </div>
      <div className="w-full">
        {userData?.userInfo && children ? children : (
          <div className="lum-card lum-bg-black border-lum-border/40 h-[30dvh] p-4"/>
        )}
      </div>
        <div className="text-sm text-lum-text-secondary mt-2">
          {userData?.userInfo ? (
            <span>Your available port range: {userData?.userInfo.port_start}-{userData?.userInfo.port_end}</span>
          ) : (
            <span>This goes so hard</span>
          )}
        </div>
    </div>
  </>;
}
