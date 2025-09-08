import Editor from '../components/Editor';
import { useContext, ReactNode } from 'react';
import { UserDataContext } from '../util/UserData';
import Explorer from '../components/Explorer';
import BlurOverlay from '../components/BlurOverlay';

export default function Layout({ children }: { children?: ReactNode }) {
  const userData = useContext(UserDataContext);

  return (
    <>
      <BlurOverlay />
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
