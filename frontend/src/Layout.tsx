import Editor from "./components/Editor";
import { useContext, useState, useEffect } from "react";
import { UserDataContext } from "./util/UserData";
import Explorer from "./components/Explorer";

export default function Layout({ children }: { children?: React.ReactNode }) {
  const userData = useContext(UserDataContext);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (userData.userInfo) {
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
          <Explorer />
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
