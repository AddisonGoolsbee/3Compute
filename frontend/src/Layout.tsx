import { FolderIcon } from "lucide-react";
import MenuItems from "./components/MenuItems";
import UploadButton from "./components/UploadButton";
import TemplateButton from "./components/TemplateButton";
import Editor from "./components/Editor";
import { useContext, useState, useEffect } from "react";
import { defaultUserData, UserDataContext } from "./util/UserData";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const userData = useContext(UserDataContext);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  console.log(userData);

  useEffect(() => {
    if (
      userData &&
      Object.keys(userData).some(
        (key) =>
          key !== "openFolders" &&
          key !== "setOpenFolders" &&
          userData[key as keyof typeof userData] !== undefined
      )
    ) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShowOverlay(false);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShowOverlay(true);
      setIsVisible(true);
    }
  }, [userData]);

  return (
    <>
      {showOverlay && (
        <div
          className={`h-screen w-screen fixed top-0 left-0 backdrop-blur-lg bg-gray-900/50 z-10 transition-opacity duration-200 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      <div className="h-[calc(100svh-6rem)] flex flex-col gap-1 items-center justify-center max-w-6xl mx-auto">
        <div className="flex flex-1 h-10 w-full gap-1">
          <div className="flex flex-col w-1/4 lum-card gap-1 p-1 lum-bg-gray-950 border-lum-border/30">
            <div className="flex items-center gap-2 p-1 pl-2 lum-bg-gray-900 rounded-lum-1">
              <FolderIcon size={20} />
              <span className="flex-1">Files</span>
              <div>
                <UploadButton />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {Array.isArray(userData?.files) ? (
                <MenuItems files={userData?.files} />
              ) : userData?.userInfo ? (
                <div className="text-red-500">Error loading files</div>
              ) : (
                <MenuItems files={defaultUserData.files} />
              )}
            </div>
            {userData?.userInfo && (
              <div className="flex flex-col">
                <TemplateButton userInfo={userData?.userInfo} />
              </div>
            )}
          </div>
          <Editor />
        </div>
        <div className="w-full">
          {userData?.userInfo && children ? (
            children
          ) : (
            <div className="lum-card lum-bg-black border-lum-border/40 h-[30dvh] p-4" />
          )}
        </div>
        <div className="text-sm text-lum-text-secondary mt-2">
          {userData?.userInfo ? (
            <span>
              Your available port range: {userData?.userInfo.port_start}-
              {userData?.userInfo.port_end}
            </span>
          ) : (
            <span>This goes so hard</span>
          )}
        </div>
      </div>
    </>
  );
}

