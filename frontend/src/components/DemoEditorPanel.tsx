import { Check, ChevronDown, Eye, FileText, Play, X } from 'lucide-react';
import { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { setupDaylightTheme, DAYLIGHT_THEME } from '../util/monacoTheme';
import { languageMap } from '../util/languageMap';
import { PrimaryButton } from './ui/Buttons';
import { cn } from '../util/cn';

/** Demo-only Editor panel that mirrors the visuals of components/Editor: same
 *  outer wrapper, same tab strip, same Monaco theme, same Run button.
 *  Edits live in browser state (the parent owns ``files``). The Save status
 *  pill shows "Local only" to make demo behavior explicit. */

export interface DemoOpenTab {
  path: string;
  name: string;
}

export interface DemoEditorPanelProps {
  openTabs: DemoOpenTab[];
  activePath: string | null;
  /** Map of path → file content. The parent owns this so terminal "cat"
   *  matches what the user has been editing. */
  files: Record<string, string>;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
  onChange: (path: string, value: string) => void;
  /** Fired when the user clicks Run on a runnable file. The /demo page wires
   *  this to dispatch a ``csroom:run-command`` event so the simulated
   *  terminal can pick it up — same contract as the real editor. */
  onRun?: (path: string, command: string) => void;
}

function inferLanguage(filename: string): keyof typeof languageMap {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  for (const [key, lang] of Object.entries(languageMap)) {
    if (lang.extensions.includes(ext)) return key as keyof typeof languageMap;
  }
  return 'plaintext' as keyof typeof languageMap;
}

const runCommandFor: Partial<Record<string, (loc: string) => string>> = {
  python: (loc) => `python3 "${loc}"\n`,
  javascript: (loc) => `node "${loc}"\n`,
};

export function DemoEditorPanel({
  openTabs, activePath, files, onActivate, onClose, onChange, onRun,
}: DemoEditorPanelProps) {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  // Markdown files default to rendered preview; the eye icon toggles to
  // raw source. Mirrors components/Editor.tsx behavior.
  const [mdPreview, setMdPreview] = useState<boolean>(true);

  const activeTab = openTabs.find((t) => t.path === activePath) ?? null;
  const currentLanguage = activeTab ? inferLanguage(activeTab.name) : ('plaintext' as keyof typeof languageMap);
  const currentLanguageInfo = languageMap[currentLanguage];
  const monacoLanguage = currentLanguageInfo?.language ?? 'plaintext';
  const runner = runCommandFor[currentLanguage];
  const canRun = !!(activeTab && runner);
  const isMarkdown = currentLanguage === 'markdown';
  const showPreview = isMarkdown && mdPreview;

  return (
    <div className="relative flex flex-col h-full bg-ide-bg border border-ide-rule rounded-lg overflow-hidden w-full">
      {!activeTab && (
        <div className="flex-1 flex items-center justify-center text-ink-muted body">Click a file to view it</div>
      )}

      {activeTab && (
        <div className="flex items-stretch bg-ide-elevated border-b border-ide-rule shrink-0 min-h-10">
          <div className="flex flex-1 min-w-0 overflow-x-auto">
            {openTabs.map((tab) => {
              const isActive = tab.path === activeTab.path;
              const tabExt = tab.name.split('.').pop()?.toLowerCase() || '';
              const tabLang = Object.values(languageMap).find((l) => l.extensions.includes(tabExt));
              const TabIcon = tabLang?.icon ?? FileText;
              return (
                <div
                  key={tab.path}
                  className={cn(
                    'group/tab inline-flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 border-r border-ide-rule cursor-pointer font-mono text-[13px] transition-colors shrink-0',
                    isActive
                      ? 'bg-ide-bg border-b-2 border-ochre text-ink-strong'
                      : 'border-b-2 border-transparent text-ink-muted hover:bg-ide-bg/50 hover:text-ink-strong',
                  )}
                  title={tab.path}
                  onClick={() => { if (!isActive) onActivate(tab.path); }}
                >
                  <TabIcon size={12} className="shrink-0" />
                  <span className="truncate max-w-[200px]">{tab.name}</span>
                  <button
                    type="button"
                    aria-label={`Close ${tab.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose(tab.path);
                    }}
                    className="ml-1 p-0.5 rounded-sm text-ink-subtle hover:bg-paper-tinted hover:text-ink-strong transition-colors cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 px-2 border-l border-ide-rule">
            <span
              className="text-[11.5px] px-1 select-none whitespace-nowrap font-mono text-ink-subtle"
              title="Edits in the demo are kept in your browser only. Sign up to persist."
            >
              Local only
            </span>

            {isMarkdown && (
              <button
                type="button"
                title={mdPreview ? 'Show source' : 'Show preview'}
                aria-label={mdPreview ? 'Show source' : 'Show preview'}
                onClick={() => setMdPreview(!mdPreview)}
                className={cn(
                  'inline-flex items-center justify-center p-1.5 rounded-sm transition-colors cursor-pointer shrink-0',
                  mdPreview
                    ? 'text-navy bg-navy-soft hover:brightness-105'
                    : 'text-ink-muted hover:text-ink-strong hover:bg-paper-tinted',
                )}
              >
                <Eye size={14} />
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-mono text-ink-muted hover:bg-paper-tinted hover:text-ink-strong transition-colors cursor-pointer"
              >
                {currentLanguageInfo?.icon && <currentLanguageInfo.icon size={14} />}
                <span>{currentLanguageInfo?.name ?? currentLanguage}</span>
                <ChevronDown size={14} />
              </button>
              {langMenuOpen && (
                <ul className="absolute right-0 top-full mt-1 max-h-[260px] overflow-y-auto bg-paper-elevated border border-rule-soft rounded-md shadow-md py-1 min-w-[180px] z-50">
                  {Object.entries(languageMap).map(([key, lang]) => {
                    const isActive = key === currentLanguage;
                    const Icon = lang.icon;
                    return (
                      <li
                        key={key}
                        onClick={() => setLangMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer font-mono',
                          isActive
                            ? 'text-ink-strong bg-paper-tinted'
                            : 'text-ink-default hover:bg-paper-tinted hover:text-ink-strong',
                        )}
                      >
                        {isActive ? (
                          <Check size={12} className="text-navy shrink-0" />
                        ) : (
                          <span className="w-3 shrink-0" />
                        )}
                        <Icon size={14} className="shrink-0" />
                        <span>{lang.name}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {canRun && (
              <PrimaryButton
                color="forest"
                icon={<Play size={14} />}
                onClick={() => {
                  if (!activeTab || !runner) return;
                  // Strip any leading slashes so we don't end up with
                  // ``/app//path`` when the file path is already absolute.
                  const rel = activeTab.path.replace(/^\/+/, '');
                  const command = runner(`/app/${rel}`);
                  onRun?.(activeTab.path, command);
                }}
                className="px-3! py-1.5! text-xs! gap-1.5!"
              >
                Run
              </PrimaryButton>
            )}
          </div>
        </div>
      )}

      {activeTab && showPreview && (
        <div className="flex-1 overflow-auto p-6 bg-ide-bg">
          <div className="markdown-content">
            <Markdown remarkPlugins={[remarkGfm]}>
              {files[activeTab.path] ?? ''}
            </Markdown>
          </div>
        </div>
      )}

      {activeTab && !showPreview && (
        <div className="flex-1 min-h-0">
          <MonacoEditor
            height="100%"
            language={monacoLanguage}
            value={files[activeTab.path] ?? ''}
            beforeMount={setupDaylightTheme}
            theme={DAYLIGHT_THEME}
            onChange={(v) => onChange(activeTab.path, v ?? '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              lineNumbers: 'on',
              renderWhitespace: 'selection',
              bracketPairColorization: { enabled: true },
              padding: { top: 8 },
            }}
          />
        </div>
      )}
    </div>
  );
}
