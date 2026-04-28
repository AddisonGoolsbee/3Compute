import Editor from './components/Editor';
import { ReactNode } from 'react';
import Explorer from './components/Explorer';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';

interface LayoutProps {
  /** Bottom panel content (defaults to an empty IDE-tinted box). The real
   *  IDE passes <TerminalTabs /> here. */
  children?: ReactNode;
  /** Override the left explorer panel. Real IDE leaves this undefined; the
   *  demo plugs in a static, demo-aware tree that mirrors the same visuals. */
  explorer?: ReactNode;
  /** Override the editor panel. Same pattern as explorer. */
  editor?: ReactNode;
  /** When true, the layout fills its flex parent (``h-full``) instead of
   *  computing its height directly from the viewport. Used by the demo
   *  page where a banner sits between the global Nav and this layout —
   *  the parent does the height math so the banner doesn't push the
   *  bottom panel below the fold. */
  fillParent?: boolean;
}

export default function Layout({
  children, explorer, editor, fillParent = false,
}: LayoutProps) {
  return (
    <>
      <div className={
        fillParent
          ? 'h-full w-full flex flex-col bg-paper p-2 gap-2'
          : 'h-[calc(100svh-5.5rem)] w-full flex flex-col bg-paper p-2 gap-2'
      }>
        <PanelGroup orientation="vertical" className="flex-1">
          <Panel minSize="25%" defaultSize="62%">
            <PanelGroup orientation="horizontal" className="h-full">
              <Panel
                minSize="200px"
                defaultSize="20%"
                style={{ overflow: 'visible', position: 'relative', zIndex: 30 }}
              >
                <div className="h-full">
                  {explorer ?? <Explorer />}
                </div>
              </Panel>
              <PanelResizeHandle className="w-2 flex items-center justify-center group cursor-col-resize">
                <div className="w-px h-full bg-rule group-hover:bg-navy/60 transition-colors duration-150" />
              </PanelResizeHandle>
              <Panel minSize="30%">
                <div className="h-full">
                  {editor ?? <Editor />}
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle className="h-2 flex items-center justify-center group cursor-row-resize">
            <div className="h-px w-full bg-rule group-hover:bg-navy/60 transition-colors duration-150" />
          </PanelResizeHandle>
          <Panel minSize="10%" defaultSize="38%">
            <div className="h-full">
              {children ?? <div className="h-full bg-ide-bg border border-ide-rule rounded-lg" />}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </>
  );
}
