import Editor from './components/Editor';
import { useContext, useState, useEffect, ReactNode } from 'react';
import { UserDataContext } from './util/UserData';
import Explorer from './components/Explorer';
import { getClasses } from '@luminescent/ui-react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';

export default function Layout({ children }: { children?: ReactNode }) {
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
          className={getClasses({
            'h-screen w-screen fixed top-0 left-0 backdrop-blur-lg bg-gray-900/50 z-10 transition-opacity duration-200': true,
            'opacity-0': !isVisible,
          })}
        />
      )}
      <div className="h-[calc(100svh-5.5rem)] w-full flex flex-col px-1 pb-1">
        <PanelGroup orientation="vertical" className="flex-1">
          <Panel minSize="25%" defaultSize="62%">
            <PanelGroup orientation="horizontal" className="h-full">
              <Panel
                minSize="200px"
                defaultSize="20%"
                style={{ overflow: 'visible', position: 'relative', zIndex: 30 }}
              >
                <div className="h-full">
                  <Explorer />
                </div>
              </Panel>
              <PanelResizeHandle className="w-2 flex items-center justify-center group cursor-col-resize">
                <div className="w-px h-full bg-gray-700 group-hover:bg-blue-500/60 transition-colors duration-150" />
              </PanelResizeHandle>
              <Panel minSize="30%">
                <div className="h-full">
                  <Editor />
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle className="h-2 flex items-center justify-center group cursor-row-resize">
            <div className="h-px w-full bg-gray-700 group-hover:bg-blue-500/60 transition-colors duration-150" />
          </PanelResizeHandle>
          <Panel minSize="10%" defaultSize="38%">
            <div className="h-full">
              {userData?.userInfo && children ? (
                children
              ) : (
                <div className="lum-card lum-bg-black border-lum-border/40 h-full" />
              )}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </>
  );
}
